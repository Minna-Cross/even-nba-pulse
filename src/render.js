import {
  formatGameLabel,
  formatGameMeta,
  formatPageStatus,
  formatPlayLine
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
      for (const upcoming of state.upcomingGames.slice(0, 3)) {
        bodyLines.push(formatUpcomingLine(upcoming));
      }
    } else {
      dom.timelineClass += ' is-empty';
      dom.timelineHtml = `
        <div class="empty-title">No games available</div>
        <div class="empty-copy">Refresh later or check again on a game day.</div>
      `;
      bodyLines.push('No NBA games found in the live scoreboard feed.');
      bodyLines.push('Refresh later or check again on a game day.');
    }

    footerLines.push('tap next • dbl sort • scroll pages');
    dom.pageStatus = footerLines.join(' • ');
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
        dom.timelineHtml = `
          <div class="empty-title">Game has not started yet</div>
          <div class="empty-copy">${escapeHtml(game.statusText)}</div>
        `;
      } else {
        bodyLines.push('No play-by-play events available yet.');
        dom.timelineHtml = `
          <div class="empty-title">No play-by-play yet</div>
          <div class="empty-copy">The feed is connected, but no events are available right now.</div>
        `;
      }
    } else {
      for (const play of paged.items) {
        bodyLines.push(formatPlayLine(play));
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

    dom.pageStatus = footerLines.join(' • ');
  }

  dom.timeline = bodyLines.join('\n');

  return {
    dom,
    glasses: {
      header: headerLines.join('\n'),
      body: bodyLines.join('\n'),
      footer: footerLines.join('\n')
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

  return when ? `${date}: ${away} @ ${home} • ${when}` : `${date}: ${away} @ ${home}`;
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
    ? new Date(`${game.gameDate}T00:00:00Z`).toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      })
    : 'Soon';
}

function formatTeamLabel(team) {
  const code = String(team?.code ?? '').trim();
  if (!code || /^tbd$/i.test(code)) {
    return team?.name ? shortenTeamLabel(team.name) : 'TBD';
  }
  if (code.includes('/')) {
    return shortenTeamLabel(code);
  }
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
    return (
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York'
      }).format(new Date(game.startTimeUtc)) + ' ET'
    );
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
      pageStatus: 'tap next • dbl sort • scroll pages',
      errorStatus: state.error || '',
      summaryClass: 'summary-card is-empty',
      timelineClass: 'timeline-card is-empty',
      footerClass: 'footer-card'
    },
    glasses: {
      header: 'NBA PULSE\nGame Night Mode',
      body: `Connected\n${connection}\n\nLoading...`,
      footer: '🏀'
    }
  };
}

export function updateDom(dom, view) {
  dom.connectionStatus.textContent = view.dom.connectionStatus;
  dom.selectedGame.textContent = view.dom.selectedGame;
  dom.selectedMeta.textContent = view.dom.selectedMeta;
  dom.pageStatus.textContent = view.dom.pageStatus;
  dom.errorStatus.textContent = view.dom.errorStatus;

  const summaryCard = document.querySelector('.summary-card');
  const timelineCard = document.querySelector('.timeline-card');
  const footerCard = document.querySelector('.footer-card');

  if (summaryCard) summaryCard.className = view.dom.summaryClass || 'summary-card';
  if (timelineCard) timelineCard.className = view.dom.timelineClass || 'timeline-card';
  if (footerCard) footerCard.className = view.dom.footerClass || 'footer-card';

  if (view.dom.timelineHtml) {
    dom.timeline.innerHTML = view.dom.timelineHtml;
  } else {
    dom.timeline.textContent = view.dom.timeline;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build view for exit confirmation state. This renders a minimal preview and glasses view.
function buildExitConfirmationView(state) {
  return {
    dom: {
      connectionStatus: state.mockBridge
        ? 'Browser preview (mock bridge)'
        : 'Connected to Even bridge',
      selectedGame: 'Exit NBA Pulse?',
      selectedMeta: 'Click to confirm • Scroll / double-click to cancel',
      timeline: '',
      timelineHtml: `
        <div class="empty-title">Exit confirmation</div>
        <div class="empty-copy">
          Double-click opened confirmation. Click to exit, or scroll /
          double-click to stay in the app.
        </div>
      `,
      pageStatus: 'click exit • scroll cancel',
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