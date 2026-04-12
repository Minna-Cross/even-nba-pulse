const API_BASE = (import.meta.env?.VITE_NBA_API_BASE || '/api/nba').replace(/\/$/, '');

function asNetworkErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof TypeError) {
    return 'NBA feed unavailable (network/CORS). Use the local proxy in dev or set VITE_NBA_API_BASE for production.';
  }

  if (/did not match the expected pattern/i.test(message)) {
    return 'NBA feed URL is invalid for this environment. Configure VITE_NBA_API_BASE to a full URL (for example: https://your-host/api/nba).';
  }

  return message;
}

export async function fetchScoreboard(fetchImpl = fetch) {
  return fetchScoreboardByPath('scoreboard', fetchImpl);
}

export async function fetchScoreboardForDate(dateKey, fetchImpl = fetch) {
  return fetchScoreboardByPath(`scoreboard/${dateKey}`, fetchImpl);
}

async function fetchScoreboardByPath(path, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${API_BASE}/${path}`, {
      cache: 'no-store'
    });

    if (response.status === 404) {
      return { scoreboard: { games: [] } };
    }

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

    if (response.status === 404) {
      return { game: { actions: [] } };
    }

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
    const scoreboard = await fetchScoreboardForDate(dateKey, fetchImpl);
    const games = normalizeGames(scoreboard).filter((game) => game.gameStatus === 1);
    const scheduledGames = normalizeScheduleEvents(
      await fetchScheduleForDate(dateKey, fetchImpl)
    );

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
