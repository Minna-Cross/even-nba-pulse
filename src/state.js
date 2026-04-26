import { PAGE_SIZE } from './lib/constants.js';
import { paginate, sortPlays } from './lib/formatters.js';

export function createInitialState() {
  return {
    launchedAt: Date.now(),
    bridge: null,
    mockBridge: true,
    started: false,
    loading: true,
    error: '',
    games: [],
    upcomingGames: [],
    selectedGameId: null,
    selectedGameIndex: -1,
    plays: [],
    sortDirection: 'desc',
    pageIndex: 0,
    confirmExitOpen: false,
    refreshTimer: null,
    lastUpdatedAt: null,
    visible: true,
    lastEventCode: null,
    eventLog: []
  };
}

export function selectedGame(state) {
  return state.games.find((game) => game.gameId === state.selectedGameId) || null;
}

export function pagedPlays(state) {
  const sorted = sortPlays(state.plays);
  return paginate(sorted, state.pageIndex, PAGE_SIZE);
}

