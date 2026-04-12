import { formatGameLabel, formatGameMeta, formatPageStatus, formatPlayLine } from './lib/formatters.js';
import { SPLASH_DURATION_MS } from './lib/constants.js';
import { pagedPlays, selectedGame } from './state.js';

export function buildView(state) {
  if (shouldShowSplash(state)) {
    return buildSplashView(state);
  }

  const game = selectedGame(state);
  const paged = pagedPlays(state);
  const headerLines = [];
  const bodyLines = [];
  const footerLines = [];

  if (!game) {
    headerLines.push('NBA Pulse');
    if (state.error) {
      bodyLines.push('Live feed unavailable.');
      bodyLines.push('Check proxy / network.');
    } else if (state.upcomingGames.length) {
      bodyLines.push('No games live right now.');
      bodyLines.push('Next scheduled matchups:');
      for (const upcoming of state.upcomingGames.slice(0, 3)) {
        bodyLines.push(formatUpcomingLine(upcoming));
      }
      bodyLines.push('Times shown in ET.');
    } else {
      bodyLines.push('No NBA games found in the live scoreboard feed.');
      bodyLines.push('Refresh later or check again on a game day.');
    }
    footerLines.push('tap next • dbl sort • scroll pages');
  } else {
    headerLines.push(`NBA Pulse  ${state.selectedGameIndex + 1}/${state.games.length}`);
    headerLines.push(formatGameLabel(game));
    headerLines.push(formatGameMeta(game));

    if (!state.plays.length) {
      if (game.gameStatus === 1) {
        bodyLines.push('This game has not started yet.');
        bodyLines.push(game.statusText);
      } else {
        bodyLines.push('No play-by-play events available yet.');
      }
    } else {
      for (const play of paged.items) {
        bodyLines.push(formatPlayLine(play));
      }
    }

    footerLines.push(formatPageStatus(paged.pageIndex, paged.totalPages, state.sortDirection));
    footerLines.push(
      state.lastUpdatedAt
        ? `Updated ${new Date(state.lastUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        : 'Updated --'
    );
  }

  return {
    dom: {
      connectionStatus: state.mockBridge ? 'Browser preview (mock bridge)' : 'Connected to Even bridge',
      selectedGame: game ? `${formatGameLabel(game)} — ${game.statusText}` : 'No game selected',
      selectedMeta: game ? `${game.away.score}-${game.home.score} • ${state.sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}` : '',
      timeline: bodyLines.join('\n'),
      pageStatus: footerLines.join(' • '),
      errorStatus: state.error || ''
    },
    glasses: {
      header: headerLines.join('\n'),
      body: bodyLines.join('\n'),
      footer: footerLines.join('\n')
    }
  };
}

function formatUpcomingLine(game) {
  const date = formatDateEt(game);
  const away = formatTeamLabel(game.away);
  const home = formatTeamLabel(game.home);
  const matchup = `${away} @ ${home}`;
  const when = formatUpcomingTimeEt(game);

  return when ? `${date}: ${matchup} • ${when}` : `${date}: ${matchup}`;
}

function formatDateEt(game) {
  if (game.startTimeUtc) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York'
    }).format(new Date(game.startTimeUtc));
  }

  return game.gameDate
    ? new Date(`${game.gameDate}T00:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : 'Soon';
}

function formatTeamLabel(team) {
  const code = String(team?.code ?? '').trim();
  if (!code || /^tbd$/i.test(code)) return team?.name ? shortenTeamLabel(team.name) : 'TBD';
  if (code.includes('/')) return shortenTeamLabel(code);
  return code;
}

function shortenTeamLabel(value) {
  return String(value)
    .replace(/Los Angeles/gi, 'LA')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatUpcomingTimeEt(game) {
  if (game.startTimeUtc) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York'
    }).format(new Date(game.startTimeUtc)) + ' ET';
  }

  return cleanUpcomingStatusText(game.statusText);
}

function cleanUpcomingStatusText(statusText) {
  const raw = String(statusText || '').trim();
  if (!raw || /^tbd$/i.test(raw)) return '';

  return raw
    .replace(/^\d{1,2}\/\d{1,2}\s*-\s*/i, '')
    .replace(/\s+EDT$/i, ' ET')
    .replace(/\s+EST$/i, ' ET')
    .trim();
}

function shouldShowSplash(state) {
  return !state.error && Date.now() - state.launchedAt < SPLASH_DURATION_MS;
}

function buildSplashView(state) {
  const connection = state.mockBridge ? 'Preview mode' : 'Even bridge online';

  return {
    dom: {
      connectionStatus: state.mockBridge ? 'Browser preview (mock bridge)' : 'Connected to Even bridge',
      selectedGame: 'NBA Pulse',
      selectedMeta: 'Live scores + timeline',
      timeline: '🏀 Welcome to NBA Pulse\nLoading the live scoreboard…',
      pageStatus: 'tap next • dbl sort • scroll pages',
      errorStatus: state.error || ''
    },
    glasses: {
      header: 'NBA PULSE\nGame Night Mode',
      body: `Connected\n${connection}\n\nLoading live scoreboard...`,
      footer: 'tap to begin'
    }
  };
}

export function updateDom(dom, view) {
  dom.connectionStatus.textContent = view.dom.connectionStatus;
  dom.selectedGame.textContent = view.dom.selectedGame;
  dom.selectedMeta.textContent = view.dom.selectedMeta;
  dom.timeline.textContent = view.dom.timeline;
  dom.pageStatus.textContent = view.dom.pageStatus;
  dom.errorStatus.textContent = view.dom.errorStatus;
}
