// Choose a default base for dev builds; require explicit VITE_NBA_API_BASE in production.
const DEFAULT_API_BASE = import.meta.env.DEV ? '/api/nba' : '';
const API_BASE = (import.meta.env?.VITE_NBA_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
// Timeout for fetch requests in milliseconds. Can be configured via VITE_NBA_TIMEOUT_MS.
const REQUEST_TIMEOUT_MS = Number(import.meta.env?.VITE_NBA_TIMEOUT_MS || 8000);
// Use performance.now if available for higher resolution timing
const now = () => globalThis.performance?.now?.() ?? Date.now();

function buildApiUrl(path) {
  if (!API_BASE) {
    throw new Error(
      'VITE_NBA_API_BASE is required for production builds. ' +
      'Example: https://nba-proxy.example.com/nba'
    );
  }
  return `${API_BASE}/${path}`;
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
      'Use the local proxy in dev or set VITE_NBA_API_BASE for production.'
    );
  }
  if (/did not match the expected pattern/i.test(message) || /Invalid URL/.test(message)) {
    return 'NBA feed URL is invalid for this environment. Configure VITE_NBA_API_BASE to a full URL (for example: https://your-host/api/nba).';
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
      throw new Error(
        `${label} request failed (${response.status})` +
        (body ? `: ${body.slice(0, 160)}` : '')
      );
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
  return fetchJson('scoreboard', 'scoreboard', { scoreboard: { games: [] } }, fetchImpl);
}

export async function fetchScoreboardForDate(dateKey, fetchImpl = fetch) {
  return fetchJson(
    `scoreboard/${dateKey}`,
    `scoreboard/${dateKey}`,
    { scoreboard: { games: [] } },
    fetchImpl
  );
}

export async function fetchPlayByPlay(gameId, fetchImpl = fetch) {
  return fetchJson(
    `playbyplay/${gameId}`,
    `playbyplay/${gameId}`,
    { game: { actions: [] } },
    fetchImpl
  );
}

export async function fetchScheduleForDate(dateKey, fetchImpl = fetch) {
  return fetchJson(
    `schedule/${dateKey}`,
    `schedule/${dateKey}`,
    { events: [] },
    fetchImpl
  );
}

export function normalizeGames(scoreboardJson) {
  const games = scoreboardJson?.scoreboard?.games ?? [];
  const gameDate = scoreboardJson?.scoreboard?.gameDate || '';

  return games.map((game) => ({
    gameDate,
    gameId: String(game.gameId),
    gameStatus: Number(game.gameStatus ?? 0),
    statusText: game.gameStatusText || game.gameEt || 'Status unavailable',
    period: Number(game.period ?? 0),
    clock: game.gameClock || '',
    home: normalizeTeam(game.homeTeam),
    away: normalizeTeam(game.awayTeam),
    raw: game
  }));
}

function normalizeTeam(team) {
  return {
    id: String(team?.teamId ?? ''),
    code: team?.teamTricode || team?.teamCode || 'TEAM',
    name: `${team?.teamCity ?? ''} ${team?.teamName ?? ''}`.trim() || 'Unknown Team',
    score: Number(team?.score ?? 0)
  };
}

export function normalizeActions(playJson) {
  const actions = playJson?.game?.actions ?? [];

  return actions
    .filter((action) => action && action.description)
    .map((action) => ({
      actionNumber: Number(action.actionNumber ?? action.orderNumber ?? 0),
      order: Number(action.orderNumber ?? action.actionNumber ?? 0),
      period: Number(action.period ?? 0),
      clock: action.clock || '',
      description: action.description,
      awayScore: Number(action.scoreAway ?? 0),
      homeScore: Number(action.scoreHome ?? 0),
      scoreText:
        action.scoreAway !== undefined && action.scoreHome !== undefined
          ? `${action.scoreAway}-${action.scoreHome}`
          : '',
      raw: action
    }));
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

export async function fetchUpcomingGames(daysAhead = 3, fetchImpl = fetch) {
  const upcoming = [];
  const seen = new Set();

  for (let offset = 1; offset <= daysAhead; offset += 1) {
    const dateKey = formatDateKey(offset);
    const [scoreboardResult, scheduleResult] = await Promise.allSettled([
      fetchScoreboardForDate(dateKey, fetchImpl),
      fetchScheduleForDate(dateKey, fetchImpl)
    ]);

    if (scoreboardResult.status === 'rejected' && scheduleResult.status === 'rejected') {
      throw scoreboardResult.reason;
    }

    const games =
      scoreboardResult.status === 'fulfilled'
        ? normalizeGames(scoreboardResult.value).filter((game) => game.gameStatus === 1)
        : [];

    const scheduledGames =
      scheduleResult.status === 'fulfilled'
        ? normalizeScheduleEvents(scheduleResult.value)
        : [];

    for (const game of [...games, ...scheduledGames]) {
      if (seen.has(game.gameId)) continue;
      seen.add(game.gameId);
      upcoming.push(game);
      if (upcoming.length >= 4) return upcoming;
    }
  }

  return upcoming;
}

function normalizeScheduleEvents(scheduleJson) {
  const events = scheduleJson?.events ?? [];

  return events
    .map((event) => {
      const competition = event?.competitions?.[0] ?? {};
      const competitors = competition?.competitors ?? [];
      const home = competitors.find((team) => team?.homeAway === 'home');
      const away = competitors.find((team) => team?.homeAway === 'away');
      const statusType = competition?.status?.type ?? event?.status?.type ?? {};
      const state = String(statusType?.state || '').toLowerCase();
      const completed = Boolean(statusType?.completed);

      if (completed || state === 'post') return null;

      const gameStatus = state === 'in' ? 2 : 1;
      const gameId = String(event?.id ?? competition?.id ?? '');
      if (!gameId) return null;

      return {
        gameDate: event?.date || '',
        gameId,
        gameStatus,
        statusText: statusType?.shortDetail || statusType?.description || event?.status?.type?.shortDetail || 'Scheduled',
        period: Number(competition?.status?.period ?? 0),
        clock: competition?.status?.displayClock || '',
        home: normalizeScheduleTeam(home),
        away: normalizeScheduleTeam(away),
        raw: event
      };
    })
    .filter(Boolean);
}

function normalizeScheduleTeam(team) {
  return {
    id: String(team?.team?.id ?? ''),
    code: team?.team?.abbreviation || team?.team?.shortDisplayName || 'TEAM',
    name: team?.team?.displayName || team?.team?.shortDisplayName || 'Unknown Team',
    score: Number(team?.score ?? 0)
  };
}

function formatDateKey(offsetDays) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}
