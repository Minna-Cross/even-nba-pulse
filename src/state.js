import { PAGE_SIZE } from './lib/constants.js';
import { paginate, sortPlays } from './lib/formatters.js';

export function createInitialState() {
  return {
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
    refreshTimer: null,
    lastUpdatedAt: null,
    visible: true
  };
}

export function selectedGame(state) {
  return state.games.find((game) => game.gameId === state.selectedGameId) || null;
}

export function pagedPlays(state) {
  const sorted = sortPlays(state.plays, state.sortDirection);
  return paginate(sorted, state.pageIndex, PAGE_SIZE);
}
