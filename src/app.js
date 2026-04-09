import { REFRESH_INTERVAL_MS } from './lib/constants.js';
import { fetchPlayByPlay, fetchScoreboard, normalizeActions, normalizeGames, chooseDefaultGameIndex, gameHasStarted } from './lib/nbaApi.js';
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

export function createApp(dom) {
  const state = createInitialState();
  let unsubscribe = () => {};

  async function init() {
    const bridgeResult = await connectEvenBridge();
    state.bridge = bridgeResult.bridge;
    state.mockBridge = bridgeResult.mockBridge;

    bindDomActions();
    unsubscribe = subscribeToEvenEvents(state.bridge, handleEvenEvent);

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

      if (!games.length) {
        state.selectedGameId = null;
        state.selectedGameIndex = -1;
        state.plays = [];
        state.pageIndex = 0;
      } else {
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

  function toggleSort() {
    state.sortDirection = state.sortDirection === 'desc' ? 'asc' : 'desc';
    state.pageIndex = 0;
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

  async function handleEvenEvent(event) {
    const textEvent = event?.textEvent;
    const sysEvent = event?.sysEvent;
    const eventType = textEvent?.eventType ?? sysEvent?.eventType;

    switch (eventType) {
      case undefined:
      case EVENT.CLICK:
        await nextGame();
        break;
      case EVENT.DOUBLE_CLICK:
        toggleSort();
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
        break;
    }
  }

  function bindDomActions() {
    dom.refreshButton.addEventListener('click', () => {
      refreshAll({ keepPage: true, announceErrors: true });
    });
    dom.nextGameButton.addEventListener('click', () => {
      nextGame();
    });
    dom.toggleSortButton.addEventListener('click', () => {
      toggleSort();
    });
  }

  function render() {
    const view = buildView(state);
    updateDom(dom, view);
    pushGlassesView(state.bridge, state.started, view.glasses)
      .then((started) => {
        state.started = started;
      })
      .catch((error) => {
        state.error = error instanceof Error ? error.message : String(error);
        updateDom(dom, buildView(state));
      });
  }

  function destroy() {
    if (state.refreshTimer) {
      window.clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }
    unsubscribe();
  }

  return { init, destroy, state };
}
