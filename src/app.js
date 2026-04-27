import { REFRESH_INTERVAL_MS } from './lib/constants.js';
import { fetchPlayByPlay, fetchScoreboard, fetchUpcomingGames, normalizeActions, normalizeGames, chooseDefaultGameIndex, gameHasStarted } from './lib/nbaApi.js';
import { buildView, updateDom } from './render.js';
import { connectEvenBridge, pushGlassesView, subscribeToEvenEvents } from './evenBridge.js';
import { createInitialState, selectedGame } from './state.js';

const EVENT = {
  CLICK: 0,
  SCROLL_TOP: 1,
  SCROLL_BOTTOM: 2,
  DOUBLE_CLICK: 3,
  FOREGROUND_ENTER: 4,
  FOREGROUND_EXIT: 5,
  ABNORMAL_EXIT: 6
};

const TOUCH_SOURCE = {
  DUMMY_NULL: 0,
  GLASSES_R: 1,
  RING: 2,
  GLASSES_L: 3
};

export function getEvenEventType(event) {
  const textEvent = event?.textEvent;
  const sysEvent = event?.sysEvent;
  return textEvent?.eventType ?? sysEvent?.eventType;
}

export function isTouchFromRingOrGlasses(event) {
  const sysEvent = event?.sysEvent;
  const eventSource = sysEvent?.eventSource;
  return eventSource === TOUCH_SOURCE.RING || 
         eventSource === TOUCH_SOURCE.GLASSES_R || 
         eventSource === TOUCH_SOURCE.GLASSES_L;
}

export function createApp(dom) {
  const state = createInitialState();
  let unsubscribe = () => {};

  async function init() {
    const bridgeResult = await connectEvenBridge();
    state.bridge = bridgeResult.bridge;
    state.mockBridge = bridgeResult.mockBridge;

    bindDomActions();
    unsubscribe = subscribeToEvenEvents(state.bridge, (event) => {
      runUserAction(() => handleEvenEvent(event));
    });

    await refreshAll({ keepPage: false, announceErrors: true });
    state.refreshTimer = window.setInterval(() => {
      if (state.visible) {
        refreshAll({ keepPage: true, announceErrors: false });
      }
    }, REFRESH_INTERVAL_MS);
  }

  async function refreshAll({ keepPage, announceErrors }) {
    try {
      state.loading = true;
      state.error = '';
      render();

      const scoreboard = await fetchScoreboard();
      const games = normalizeGames(scoreboard);
      state.games = games;
      const hasLiveGame = games.some((game) => game.gameStatus === 2);

      if (!hasLiveGame) {
        state.selectedGameId = null;
        state.selectedGameIndex = -1;
        state.plays = [];
        state.pageIndex = 0;
        state.upcomingGames = await fetchUpcomingGames(5);
      } else {
        state.upcomingGames = [];
        const selectedIndex = resolveSelectedGameIndex(games);
        state.selectedGameIndex = selectedIndex;
        state.selectedGameId = games[selectedIndex].gameId;
        if (!keepPage) state.pageIndex = 0;
        await refreshSelectedGamePlays();
      }

      state.lastUpdatedAt = Date.now();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      state.error = error instanceof Error ? error.message : String(error);
      if (announceErrors) {
        console.error(error);
      }
      render();
    }
  }

  function resolveSelectedGameIndex(games) {
    const currentIndex = games.findIndex((game) => game.gameId === state.selectedGameId);
    if (currentIndex >= 0) return currentIndex;
    return chooseDefaultGameIndex(games);
  }

  async function refreshSelectedGamePlays() {
    const game = selectedGame(state);
    if (!game || !gameHasStarted(game)) {
      state.plays = [];
      return;
    }

    const playJson = await fetchPlayByPlay(game.gameId);
    state.plays = normalizeActions(playJson);

    const maxPageIndex = Math.max(0, Math.ceil(state.plays.length / 7) - 1);
    state.pageIndex = Math.min(state.pageIndex, maxPageIndex);
  }

  async function nextGame() {
    if (!state.games.length) return;
    state.selectedGameIndex = (state.selectedGameIndex + 1) % state.games.length;
    state.selectedGameId = state.games[state.selectedGameIndex].gameId;
    state.pageIndex = 0;
    await refreshSelectedGamePlays();
    render();
  }

  function nextPage() {
    const totalPages = Math.max(1, Math.ceil(state.plays.length / 7));
    state.pageIndex = Math.min(state.pageIndex + 1, totalPages - 1);
    render();
  }

  function prevPage() {
    state.pageIndex = Math.max(state.pageIndex - 1, 0);
    render();
  }

  // Show exit confirmation overlay. Ignored if already open.
  function openExitConfirmation() {
    if (state.confirmExitOpen) return;
    state.confirmExitOpen = true;
    render();
  }

  // Close exit confirmation overlay if open.
  function closeExitConfirmation() {
    if (!state.confirmExitOpen) return;
    state.confirmExitOpen = false;
    render();
  }

  // Request the host or browser to exit the application.
  function requestExit() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (typeof window.close === 'function') {
      window.close();
      return;
    }
    state.error =
      'Exit was confirmed, but no host close action is available. ' +
      'Replace requestExit() with the Even host close API if your bridge exposes one.';
    render();
  }

  async function confirmExit() {
    closeExitConfirmation();
    requestExit();
  }

  async function handleEvenEvent(event) {
    const eventType = getEvenEventType(event);
    const isTouch = isTouchFromRingOrGlasses(event);

    // Log event code to state for on-glasses debugging
    state.lastEventCode = eventType;
    state.eventLog = [...state.eventLog.slice(-9), { code: eventType, time: Date.now() }];
    console.log('[EVENT] Code:', eventType, 'Touch:', isTouch, 'Log:', state.eventLog.length, 'items');

    if (eventType == null && !isTouch) {
      console.warn('⚠️ Unknown event type:', event);
      return;
    }

    // When exit confirmation is open, interpret events as confirm/cancel actions
    if (state.confirmExitOpen) {
      switch (eventType) {
        case EVENT.CLICK:
          await confirmExit();
          break;
        case EVENT.DOUBLE_CLICK:
        case EVENT.SCROLL_TOP:
        case EVENT.SCROLL_BOTTOM:
          closeExitConfirmation();
          break;
        case EVENT.FOREGROUND_EXIT:
        case EVENT.ABNORMAL_EXIT:
          state.visible = false;
          closeExitConfirmation();
          break;
        default:
          // Touch from ring/glasses also confirms exit
          if (isTouch) {
            await confirmExit();
          }
          break;
      }
      return;
    }

    // Normal mode: CLICK or touch from ring/glasses triggers next game
    if (eventType === EVENT.CLICK || isTouch) {
      await nextGame();
      return;
    }

    switch (eventType) {
      case EVENT.DOUBLE_CLICK:
        openExitConfirmation();
        break;
      case EVENT.SCROLL_BOTTOM:
        nextPage();
        break;
      case EVENT.SCROLL_TOP:
        prevPage();
        break;
      case EVENT.FOREGROUND_ENTER:
        state.visible = true;
        await refreshAll({ keepPage: true, announceErrors: false });
        break;
      case EVENT.FOREGROUND_EXIT:
      case EVENT.ABNORMAL_EXIT:
        state.visible = false;
        break;
      default:
        console.log('⚠️ Unhandled event type:', eventType);
        break;
    }
  }

  function bindDomActions() {
    dom.nextGameButton.addEventListener('click', () => {
      runUserAction(nextGame);
    });

    // Attach handlers for exit confirmation dialog if present
    if (dom.exitCancelButton) {
      dom.exitCancelButton.addEventListener('click', () => {
        closeExitConfirmation();
      });
    }

    if (dom.exitConfirmButton) {
      dom.exitConfirmButton.addEventListener('click', () => {
        runUserAction(confirmExit);
      });
    }

    if (dom.exitDialog) {
      dom.exitDialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeExitConfirmation();
      });
    }
  }

  function runUserAction(action) {
    Promise.resolve()
      .then(() => action())
      .catch((error) => {
        state.error = error instanceof Error ? error.message : String(error);
        render();
      });
  }

  function render() {
    const view = buildView(state);
    updateDom(dom, view);
    syncExitDialog();
    pushGlassesView(state.bridge, state.started, view.glasses)
      .then((started) => {
        state.started = started;
      })
      .catch((error) => {
        state.error = error instanceof Error ? error.message : String(error);
        updateDom(dom, buildView(state));
      });
  }

  // Synchronize the state.confirmExitOpen with the native dialog element, opening or closing as needed.
  function syncExitDialog() {
    if (!dom.exitDialog) return;
    if (state.confirmExitOpen && !dom.exitDialog.open) {
      dom.exitDialog.showModal();
      return;
    }
    if (!state.confirmExitOpen && dom.exitDialog.open) {
      dom.exitDialog.close();
    }
  }

  function destroy() {
    if (state.refreshTimer) {
      window.clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }
    unsubscribe();
  }

  return { init, destroy, state, handleEvenEvent };
}


