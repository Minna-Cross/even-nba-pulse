import {
  formatGameLabel,
  formatGameMeta,
  formatPageStatus,
  formatPlayLine,
  formatPlayLineGlasses
} from './lib/formatters.js';
import { SPLASH_DURATION_MS } from './lib/constants.js';
import { pagedPlays, selectedGame } from './state.js';

export function buildView(state) {
  // Show exit confirmation overlay if requested
  if (state.confirmExitOpen) {
    return buildExitConfirmationView(state);
  }

  if (shouldShowSplash(state)) {
    return buildSplashView(state);
  }

  const game = selectedGame(state);
  const paged = pagedPlays(state);
  const headerLines = [];
  const bodyLines = [];
  const footerLines = [];
  const glassesBodyLines = [];

  const dom = {
    connectionStatus: state.mockBridge
      ? 'Browser preview (mock bridge)'
      : 'Connected to Even bridge',
    selectedGame: 'No game selected',
    selectedMeta: '',
    timeline: '',
    pageStatus: '',
    errorStatus: state.error || '',
    timelineHtml: '',
    summaryClass: 'summary-card',
    timelineClass: 'timeline-card',
    footerClass: 'footer-card'
  };

  if (!game) {
    headerLines.push('NBA Pulse');

    dom.summaryClass += ' is-empty';

    if (state.error) {
      dom.timelineClass += ' is-error';
      dom.timelineHtml = `
        <div class="empty-title">Live feed unavailable</div>
        <div class="empty-copy">Check proxy or network settings, then refresh.</div>
      `;
      bodyLines.push('Live feed unavailable.');
      bodyLines.push('Check proxy / network.');
      glassesBodyLines.push('Live feed unavailable.');
      glassesBodyLines.push('Check proxy / network.');
    } else if (state.upcomingGames.length) {
      dom.timelineClass += ' is-empty';
      dom.timelineHtml = `
        <div class="empty-title">No games live right now</div>
        <div class="upcoming-list">
          ${state.upcomingGames.slice(0, 3).map(renderUpcomingRow).join('')}
        </div>
      `;
      bodyLines.push('No games live right now.');
      bodyLines.push('Next scheduled matchups:');
      glassesBodyLines.push('No games live right now.');
      glassesBodyLines.push('Next scheduled matchups:');
      for (const upcoming of state.upcomingGames.slice(0, 3)) {
        bodyLines.push(formatUpcomingLine(upcoming));
        glassesBodyLines.push(formatUpcomingLine(upcoming));
      }
    } else {
      dom.timelineClass += ' is-empty';
      dom.timelineHtml = `
        <div class="empty-title">No games available</div>
        <div class="empty-copy">Refresh later or check again on a game day.</div>
      `;
      bodyLines.push('No NBA games found in the live scoreboard feed.');
      bodyLines.push('Refresh later or check again on a game day.');
      glassesBodyLines.push('No NBA games found in the live scoreboard feed.');
      glassesBodyLines.push('Refresh later or check again on a game day.');
    }

    footerLines.push('tap next - dbl sort - scroll pages');
    dom.pageStatus = footerLines.join(' - ');
  } else {
    if (game.gameStatus === 2) {
      dom.summaryClass += ' is-live';
    } else if (game.gameStatus === 1) {
      dom.summaryClass += ' is-scheduled';
    }

    headerLines.push(`NBA Pulse  ${state.selectedGameIndex + 1}/${state.games.length}`);
    headerLines.push(formatGameLabel(game));
    headerLines.push(formatGameMeta(game));

    dom.selectedGame = `${formatGameLabel(game)} — ${game.statusText}`;
    dom.selectedMeta = `${game.away.score}-${game.home.score} • ${state.sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}`;

    if (!state.plays.length) {
      if (game.gameStatus === 1) {
        bodyLines.push('This game has not started yet.');
        bodyLines.push(game.statusText);
        glassesBodyLines.push('This game has not started yet.');
        glassesBodyLines.push(game.statusText);
        dom.timelineHtml = `
          <div class="empty-title">Game has not started yet</div>
          <div class="empty-copy">${escapeHtml(game.statusText)}</div>
        `;
      } else {
        bodyLines.push('No play-by-play events available yet.');
        glassesBodyLines.push('No play-by-play events available yet.');
        dom.timelineHtml = `
          <div class="empty-title">No play-by-play yet</div>
          <div class="empty-copy">The feed is connected, but no events are available right now.</div>
        `;
      }
    } else {
      for (const play of paged.items) {
        bodyLines.push(formatPlayLine(play));
        glassesBodyLines.push(formatPlayLineGlasses(play));
      }
      dom.timelineHtml = '';
    }

    footerLines.push(formatPageStatus(paged.pageIndex, paged.totalPages, state.sortDirection));
    footerLines.push(
      state.lastUpdatedAt
        ? `Updated ${new Date(state.lastUpdatedAt).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
          })}`
        : 'Updated --'
    );

    dom.pageStatus = footerLines.join(' - ');
  }

  dom.timeline = bodyLines.join('\n');

  return {
    dom,
    glasses: {
      header: headerLines.join('\n'),
      body: glassesBodyLines.join('\n'),
      footer: footerLines.join(' - ')
    }
  };
}

function renderUpcomingRow(game) {
  const date = formatDateEt(game);
  const away = formatTeamLabel(game.away);
  const home = formatTeamLabel(game.home);
  const when = formatUpcomingTimeEt(game);

  return `
    <div class="upcoming-row">
      <div class="upcoming-date">${escapeHtml(date)}</div>
      <div>
        <div class="upcoming-matchup">${escapeHtml(`${away} @ ${home}`)}</div>
        <div class="upcoming-time">${escapeHtml(when || '')}</div>
      </div>
    </div>
  `;
}

function formatUpcomingLine(game) {
  const date = formatDateEt(game);
  const away = formatTeamLabel(game.away);
  const home = formatTeamLabel(game.home);
  const when = formatUpcomingTimeEt(game);

  return when ? `${date}: ${away} @ ${home} - ${when}` : `${date}: ${away} @ ${home}`;
}

function formatDateEt(game) {
  if (game.startTimeUtc) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York'
    }).format(new Date(game.startTimeUtc));
  }

  return '';
}

function formatUpcomingTimeEt(game) {
  if (game.startTimeUtc) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York'
    }).format(new Date(game.startTimeUtc));
  }

  return '';
}

function formatTeamLabel(team) {
  return team.code || team.market || team.name || 'Unknown';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function shouldShowSplash(state) {
  return Date.now() - state.launchedAt < SPLASH_DURATION_MS;
}

function buildSplashView(state) {
  return {
    dom: {
      connectionStatus: state.mockBridge
        ? 'Browser preview (mock bridge)'
        : 'Connected to Even bridge',
      selectedGame: 'NBA Pulse',
      selectedMeta: 'Live scores + timeline',
      timeline: '🏀 Welcome to NBA Pulse\nLoading the live scoreboard…',
      timelineHtml: `
        <div class="empty-title">Welcome to NBA Pulse</div>
        <div class="empty-copy">Loading...</div>
      `,
      pageStatus: 'tap next - dbl sort - scroll pages',
      errorStatus: state.error || '',
      summaryClass: 'summary-card is-empty',
      timelineClass: 'timeline-card is-empty',
      footerClass: 'footer-card'
    },
    glasses: {
      header: 'NBA PULSE\nGame Night Mode',
      body: `Connected\n${state.mockBridge ? 'Browser preview' : 'Connected'}\n\nLoading...`,
      footer: '🏀'
    }
  };
}

function buildExitConfirmationView(state) {
  const connection = state.mockBridge
    ? 'Browser preview (mock bridge)'
    : 'Connected to Even bridge';

  return {
    dom: {
      connectionStatus: connection,
      selectedGame: 'NBA Pulse',
      selectedMeta: 'Exit confirmation',
      timeline: '',
      pageStatus: 'click exit - scroll cancel',
      errorStatus: state.error || '',
      summaryClass: 'summary-card is-empty',
      timelineClass: 'timeline-card is-empty',
      footerClass: 'footer-card'
    },
    glasses: {
      header: 'NBA PULSE',
      body: 'Exit app?\nClick = exit\nScroll = cancel',
      footer: 'Confirm exit'
    }
  };
}

export function updateDom(dom, view) {
  dom.connectionStatus.textContent = view.dom.connectionStatus;
  dom.selectedGame.textContent = view.dom.selectedGame;
  dom.selectedMeta.textContent = view.dom.selectedMeta;
  dom.pageStatus.textContent = view.dom.pageStatus;
  dom.errorStatus.textContent = view.dom.errorStatus;

  if (view.dom.timelineHtml) {
    dom.timeline.innerHTML = view.dom.timelineHtml;
  } else {
    dom.timeline.textContent = view.dom.timeline;
  }

  if (dom.summary) dom.summary.className = view.dom.summaryClass;
  if (dom.timeline) dom.timeline.className = view.dom.timelineClass;
  if (dom.footer) dom.footer.className = view.dom.footerClass;
}




