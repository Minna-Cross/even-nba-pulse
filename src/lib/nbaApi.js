const API_BASE = (import.meta.env?.VITE_NBA_API_BASE || '/api/nba').replace(/\/$/, '');

function asNetworkErrorMessage(error) {
  if (error instanceof TypeError) {
    return 'NBA feed unavailable (network/CORS). Use the local proxy in dev or set VITE_NBA_API_BASE for production.';
  }
  return error instanceof Error ? error.message : String(error);
}

export async function fetchScoreboard(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${API_BASE}/scoreboard`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Scoreboard request failed (${response.status})`);
    }

    return response.json();
  } catch (error) {
    throw new Error(asNetworkErrorMessage(error));
  }
}

export async function fetchPlayByPlay(gameId, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(
      `${API_BASE}/playbyplay/${gameId}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Play-by-play request failed (${response.status})`);
    }

    return response.json();
  } catch (error) {
    throw new Error(asNetworkErrorMessage(error));
  }
}

export async function fetchScheduleForDate(dateKey, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${API_BASE}/schedule/${dateKey}`, {
      cache: 'no-store'
    });

    if (response.status === 404) {
      return { events: [] };
    }

    if (!response.ok) {
      throw new Error(`Schedule request failed (${response.status})`);
    }

    return response.json();
  } catch (error) {
    throw new Error(asNetworkErrorMessage(error));
  }
}

export function normalizeGames(scoreboardJson) {
  const games = scoreboardJson?.scoreboard?.games ?? [];

  return games.map((game) => ({
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

export async function fetchUpcomingGames({ daysAhead = 4, includeToday = true, fetchImpl = fetch } = {}) {
  const upcoming = [];
  const startOffset = includeToday ? 0 : 1;

  for (let offset = startOffset; offset <= daysAhead; offset += 1) {
    const dateKey = formatDateKey(offset);
    try {
      const schedule = await fetchScheduleForDate(dateKey, fetchImpl);
      const games = normalizeScheduleEvents(schedule?.events ?? []);
      for (const game of games) upcoming.push(game);
    } catch {
      // best-effort for schedule; skip failed day
    }
  }

  return upcoming
    .filter((game) => game.gameStatus === 1)
    .sort((a, b) => Date.parse(a.startTimeUtc || '') - Date.parse(b.startTimeUtc || ''))
    .slice(0, 6);
}

function normalizeScheduleEvents(events) {
  return events.map((event) => {
    const competition = event?.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const home = competitors.find((team) => team?.homeAway === 'home') || {};
    const away = competitors.find((team) => team?.homeAway === 'away') || {};
    const state = competition?.status?.type?.state;

    return {
      gameId: String(event?.id ?? ''),
      gameDate: event?.date ? event.date.slice(0, 10) : '',
      startTimeUtc: event?.date || '',
      gameStatus: state === 'pre' ? 1 : state === 'in' ? 2 : 3,
      statusText: competition?.status?.type?.shortDetail || 'TBD',
      home: {
        code: normalizeScheduleCode(home?.team?.abbreviation, home?.team?.displayName),
        name: home?.team?.displayName || 'Home Team',
        score: Number(home?.score ?? 0)
      },
      away: {
        code: normalizeScheduleCode(away?.team?.abbreviation, away?.team?.displayName),
        name: away?.team?.displayName || 'Away Team',
        score: Number(away?.score ?? 0)
      },
      raw: event
    };
  });
}

function normalizeScheduleCode(code, fallbackName) {
  const raw = String(code ?? '').trim();
  if (!raw || /^tbd$/i.test(raw)) {
    return fallbackName ? String(fallbackName).trim() : 'TBD';
  }
  return raw;
}

function formatDateKey(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}
