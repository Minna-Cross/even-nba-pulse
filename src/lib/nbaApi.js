// Production: Hybrid approach - ESPN for scoreboard (CORS), Cloudflare Worker for play-by-play.
// ESPN allows CORS (*) for scoreboard. NBA CDN requires proxy for play-by-play.
// Set VITE_NBA_API_BASE to use custom endpoints if needed.
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const NBA_PROXY_BASE = import.meta.env?.VITE_NBA_PROXY_BASE || 'https://summer-tooth-2846.minnacross.workers.dev/nba';
const API_BASE = (import.meta.env?.VITE_NBA_API_BASE || ESPN_API_BASE).replace(/\/$/, '');
// Timeout for fetch requests in milliseconds. Can be configured via VITE_NBA_TIMEOUT_MS.
const REQUEST_TIMEOUT_MS = Number(import.meta.env?.VITE_NBA_TIMEOUT_MS || 8000);
// Use performance.now if available for higher resolution timing
const now = () => globalThis.performance?.now?.() ?? Date.now();

function buildApiUrl(path) {
  // Handle query strings in path (e.g., 'scoreboard?dates=20260418')
  const [basePath, queryString] = path.split('?');
  const query = queryString ? `?${queryString}` : '';
  return `${API_BASE}/${basePath}${query}`;
}

function asNetworkErrorMessage(error, context = {}) {
  const message = error instanceof Error ? error.message : String(error);
  if (error?.name === 'AbortError') {
    return `NBA feed timed out while requesting ${context.url || context.label || 'the feed'}.`;
  }
  if (globalThis.navigator?.onLine === false) {
    return 'Device appears offline. Reconnect and try again.';
  }
  if (error instanceof TypeError) {
    return (
      `NBA feed unavailable (network/CORS) at ${context.url || 'configured endpoint'}. ` +
      'Check VITE_NBA_API_BASE configuration.'
    );
  }
  if (/did not match the expected pattern/i.test(message) || /Invalid URL/.test(message)) {
    return 'NBA feed URL is invalid for this environment. Configure VITE_NBA_API_BASE to a full URL.';
  }
  return message;
}

async function fetchJson(path, label, notFoundValue, fetchImpl = fetch) {
  const url = buildApiUrl(path);
  const controller = new AbortController();
  const startedAt = now();
  const timeoutId = globalThis.setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: controller.signal
    });
    if (response.status === 404) {
      return notFoundValue;
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`${label} request failed (${response.status})` + (body ? `: ${body.slice(0, 160)}` : ''));
    }
    return response.json();
  } catch (error) {
    console.error('[nbaApi]', { label, url, error });
    throw new Error(asNetworkErrorMessage(error, { label, url }));
  } finally {
    globalThis.clearTimeout(timeoutId);
    console.debug('[nbaApi]', label, Math.round(now() - startedAt), 'ms', url);
  }
}

export async function fetchScoreboard(fetchImpl = fetch) {
  // Today's scoreboard from ESPN (CORS-enabled)
  return fetchJson('scoreboard', 'scoreboard', { events: [] }, fetchImpl);
}

export async function fetchScoreboardForDate(dateKey, fetchImpl = fetch) {
  // Scoreboard for a specific date (YYYYMMDD format) from ESPN
  return fetchJson(
    `scoreboard?dates=${dateKey}`,
    `scoreboard/${dateKey}`,
    { events: [] },
    fetchImpl
  );
}

export async function fetchPlayByPlay(gameId, fetchImpl = fetch) {
  // Use Cloudflare Worker proxy for NBA CDN play-by-play (CORS-enabled)
  const url = `${NBA_PROXY_BASE}/playbyplay/${gameId}`;
  const controller = new AbortController();
  const startedAt = now();
  const timeoutId = globalThis.setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: controller.signal
    });
    if (response.status === 404) {
      return { game: { actions: [] } };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Play-by-play request failed (${response.status})` + (body ? `: ${body.slice(0, 160)}` : ''));
    }
    const data = await response.json();
    console.debug('[nbaApi]', 'playbyplay', Math.round(now() - startedAt), 'ms', url);
    return data;
  } catch (error) {
    console.error('[nbaApi]', { label: 'playbyplay', url, error });
    throw new Error(asNetworkErrorMessage(error, { label: 'playbyplay', url }));
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchScheduleForDate(dateKey, fetchImpl = fetch) {
  return fetchJson(
    `scoreboard?dates=${dateKey}`,
    `schedule/${dateKey}`,
    { events: [] },
    fetchImpl
  );
}

export function normalizeGames(scoreboardJson) {
  // Support ESPN API structure (events with competitions)
  const events = scoreboardJson?.events || [];
  const gameDate = scoreboardJson?.day?.date || '';

  return events.map((event) => {
    const competition = event.competitions?.[0] || {};
    const competitors = competition.competitors || [];
    const home = competitors.find((c) => c?.homeAway === 'home');
    const away = competitors.find((c) => c?.homeAway === 'away');
    const status = competition.status?.type || event.status?.type || {};
    const state = (status.state || '').toLowerCase();
    const isLive = state === 'in';
    const isCompleted = status.completed || state === 'post';

    return {
      gameDate: event.date || gameDate,
      gameId: String(event.id || ''),
      gameStatus: isLive ? 2 : isCompleted ? 3 : 1,
      statusText: status.shortDetail || status.description || 'Status unavailable',
      period: Number(competition.status?.period || 0),
      clock: competition.status?.displayClock || '',
      home: normalizeTeamEspn(home),
      away: normalizeTeamEspn(away),
      raw: event
    };
  });
}

function normalizeTeamEspn(competitor) {
  if (!competitor) return { id: '', code: 'TEAM', name: 'Unknown Team', score: 0 };
  return {
    id: String(competitor?.team?.id ?? ''),
    code: competitor?.team?.abbreviation || competitor?.team?.shortDisplayName || 'TEAM',
    name: competitor?.team?.displayName || competitor?.team?.shortDisplayName || 'Unknown Team',
    score: Number(competitor?.score ?? 0)
  };
}

export function normalizeActions(playJson) {
  // Play-by-play not available via ESPN - return empty array
  return [];
}

export function chooseDefaultGameIndex(games) {
  if (!games.length) return -1;

  const liveIndex = games.findIndex((game) => game.gameStatus === 2);
  if (liveIndex >= 0) return liveIndex;

  const upcomingIndex = games.findIndex((game) => game.gameStatus === 1);
  if (upcomingIndex >= 0) return upcomingIndex;

  return 0;
}

export function gameHasStarted(game) {
  return game && game.gameStatus !== 1;
}

export async function fetchUpcomingGames(daysToFetch = 3, fetchImpl = fetch) {
  const games = [];
  const seenGameIds = new Set();

  for (let dayOffset = 1; dayOffset <= daysToFetch; dayOffset += 1) {
    const dateKey = formatDateKey(dayOffset);
    const [scoreboardResult, scheduleResult] = await Promise.allSettled([
      fetchScoreboardForDate(dateKey, fetchImpl),
      fetchScheduleForDate(dateKey, fetchImpl)
    ]);

    if (scoreboardResult.status === 'rejected' && scheduleResult.status === 'rejected') {
      throw scoreboardResult.reason;
    }

    const scoreboardGames =
      scoreboardResult.status === 'fulfilled'
        ? normalizeGames(scoreboardResult.value).filter((g) => g.gameStatus === 1)
        : [];
    const scheduleGames = scheduleResult.status === 'fulfilled' ? extractScheduleGames(scheduleResult.value) : [];

    for (const game of [...scoreboardGames, ...scheduleGames]) {
      if (!seenGameIds.has(game.gameId)) {
        seenGameIds.add(game.gameId);
        games.push(game);
        if (games.length >= 4) {
          return games;
        }
      }
    }
  }

  return games;
}

function extractScheduleGames(scheduleJson) {
  return (scheduleJson?.events || [])
    .map((event) => {
      const competition = event.competitions?.[0] || {};
      const competitors = competition.competitors || [];
      const home = competitors.find((c) => c?.homeAway === 'home');
      const away = competitors.find((c) => c?.homeAway === 'away');
      const status = competition.status?.type || event.status?.type || {};
      const state = (status.state || '').toLowerCase();

      if (status.completed || state === 'post') {
        return null;
      }

      const gameStatus = state === 'in' ? 2 : 1;
      const gameId = String(event.id || competition.id || '');

      return gameId
        ? {
            gameDate: event.date || '',
            gameId,
            gameStatus,
            statusText: status.shortDetail || status.description || 'Scheduled',
            period: Number(competition.status?.period || 0),
            clock: competition.status?.displayClock || '',
            home: normalizeTeamEspn(home),
            away: normalizeTeamEspn(away),
            raw: event
          }
        : null;
    })
    .filter(Boolean);
}

function formatDateKey(daysFromToday) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function getTeamCode(team) {
  return team?.code || '-';
}

export function truncateText(text, maxLength = 38) {
  const safe = text ?? '';
  const trimmed = String(safe).trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1)}.`;
}

export function formatClock(clock) {
  const safe = clock ?? '';
  if (!safe) return '';
  if (safe.startsWith('PT') && safe.endsWith('S')) {
    const match = safe.match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return safe;
    const minutes = Number(match[1] || 0);
    const seconds = Math.floor(Number(match[2] || 0));
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return safe;
}

export function formatGameMatchup(game) {
  return `${game.away.code} @ ${game.home.code}`;
}

export function formatGameSummary(game) {
  return `${game.away.code} ${game.away.score} - ${game.home.score} ${game.home.code} | ${game.statusText}`;
}

export function formatPlaySummary(play) {
  const periodLabel = play.period > 0 ? `Q${play.period}` : '-';
  const clockLabel = formatClock(play.clock) || '-';
  const scoreLabel = play.scoreText || `${play.awayScore}-${play.homeScore}`;
  const description = truncateText(play.description);
  return `${periodLabel} ${clockLabel} | ${scoreLabel} | ${description}`;
}

export function sortPlays(plays, direction = 'desc') {
  const sorted = [...plays].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.actionNumber - b.actionNumber;
  });
  return direction === 'asc' ? sorted : sorted.reverse();
}

export function paginateItems(items, pageIndex, pageSize = 7) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeIndex = Math.min(Math.max(pageIndex, 0), totalPages - 1);
  const start = safeIndex * pageSize;
  return {
    totalPages,
    pageIndex: safeIndex,
    items: items.slice(start, start + pageSize)
  };
}

export function formatPaginationStatus(pageIndex, totalPages, sortDirection) {
  const directionLabel = sortDirection === 'asc' ? 'Oldest first' : 'Newest first';
  return `Page ${pageIndex + 1}/${totalPages}  ${directionLabel}`;
}
