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

export async function fetchScheduleForDate(dateKey, fetchImpl = fetch) {
  return fetchScheduleByPath(`schedule/${dateKey}`, fetchImpl);
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

async function fetchScheduleByPath(path, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${API_BASE}/${path}`, {
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

  for (let offset = 1; offset <= daysAhead; offset += 1) {
    const dateKey = formatDateKey(offset);
    let scheduledGames = [];

    try {
      const schedule = await fetchScheduleForDate(dateKey, fetchImpl);
      scheduledGames = normalizeScheduleGames(schedule, dateKey);
    } catch {
      // ignore and fall back to scoreboard-based lookup below
    }

    if (!scheduledGames.length) {
      try {
        const scoreboard = await fetchScoreboardForDate(dateKey, fetchImpl);
        scheduledGames = normalizeGames(scoreboard).filter((game) => game.gameStatus === 1);
      } catch {
        continue;
      }
    }

    for (const game of scheduledGames) {
      upcoming.push(game);
      if (upcoming.length >= 4) return upcoming;
    }
  }

  return upcoming;
}

function formatDateKey(offsetDays) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

function normalizeScheduleGames(scheduleJson, dateKey) {
  const events = scheduleJson?.events ?? [];

  return events
    .map((event) => {
      const competition = event?.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      const homeRaw = competitors.find((team) => team?.homeAway === 'home') || {};
      const awayRaw = competitors.find((team) => team?.homeAway === 'away') || {};
      const statusType = competition?.status?.type;
      const state = statusType?.state;
      const statusText =
        statusType?.shortDetail ||
        statusType?.detail ||
        (event?.date ? new Date(event.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'TBD');

      return {
        gameDate: event?.date ? event.date.slice(0, 10) : `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`,
        gameId: String(event?.id ?? ''),
        gameStatus: state === 'pre' ? 1 : state === 'in' ? 2 : 3,
        statusText,
        period: Number(competition?.status?.period ?? 0),
        clock: competition?.status?.displayClock || '',
        home: {
          id: String(homeRaw?.team?.id ?? ''),
          code: homeRaw?.team?.abbreviation || 'HOME',
          name: homeRaw?.team?.displayName || 'Home Team',
          score: Number(homeRaw?.score ?? 0)
        },
        away: {
          id: String(awayRaw?.team?.id ?? ''),
          code: awayRaw?.team?.abbreviation || 'AWAY',
          name: awayRaw?.team?.displayName || 'Away Team',
          score: Number(awayRaw?.score ?? 0)
        },
        raw: event
      };
    })
    .filter((game) => game.gameStatus === 1 && game.gameId);
}
