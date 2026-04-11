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
