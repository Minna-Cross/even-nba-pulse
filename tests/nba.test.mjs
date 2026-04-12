import test from 'node:test';
import assert from 'node:assert/strict';
import scoreboardFixture from './fixtures/scoreboard.fixture.json' with { type: 'json' };
import playFixture from './fixtures/playbyplay.fixture.json' with { type: 'json' };

import {
  chooseDefaultGameIndex,
  fetchPlayByPlay,
  fetchScoreboard,
  fetchUpcomingGames,
  gameHasStarted,
  normalizeActions,
  normalizeGames
} from '../src/lib/nbaApi.js';
import { formatPlayLine, sortPlays, paginate } from '../src/lib/formatters.js';

test('normalizeGames extracts teams and scores', () => {
  const games = normalizeGames(scoreboardFixture);
  assert.equal(games.length, 2);
  assert.equal(games[1].home.code, 'GSW');
  assert.equal(games[1].away.score, 84);
  assert.equal(games[0].statusText, '7:30 pm ET');
});

test('chooseDefaultGameIndex prefers live games', () => {
  const games = normalizeGames(scoreboardFixture);
  assert.equal(chooseDefaultGameIndex(games), 1);
});

test('gameHasStarted is false for scheduled and true for live', () => {
  const games = normalizeGames(scoreboardFixture);
  assert.equal(gameHasStarted(games[0]), false);
  assert.equal(gameHasStarted(games[1]), true);
});

test('normalizeActions extracts playable timeline entries', () => {
  const plays = normalizeActions(playFixture);
  assert.equal(plays.length, 4);
  assert.equal(plays[0].description, 'Stephen Curry makes 26-foot three point jumper');
  assert.equal(plays[3].scoreText, '84-87');
});

test('sortPlays supports descending and ascending orders', () => {
  const plays = normalizeActions(playFixture);
  const desc = sortPlays(plays, 'desc');
  const asc = sortPlays(plays, 'asc');

  assert.equal(desc[0].actionNumber, 151);
  assert.equal(desc.at(-1).actionNumber, 4);
  assert.equal(asc[0].actionNumber, 4);
  assert.equal(asc.at(-1).actionNumber, 151);
});

test('paginate returns stable page windows', () => {
  const plays = sortPlays(normalizeActions(playFixture), 'desc');
  const page = paginate(plays, 0, 2);
  assert.equal(page.totalPages, 2);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].actionNumber, 151);
});

test('formatPlayLine produces compact timeline text', () => {
  const plays = normalizeActions(playFixture);
  const line = formatPlayLine(plays[2]);
  assert.match(line, /Q3 5:11/);
  assert.match(line, /84-87/);
  assert.match(line, /Anthony Davis/);
});

test('fetchScoreboard maps invalid URL pattern errors to config guidance', async () => {
  const fetchImpl = async () => {
    throw new Error('The string did not match the expected pattern.');
  };

  await assert.rejects(
    () => fetchScoreboard(fetchImpl),
    /VITE_NBA_API_BASE to a full URL/
  );
});

test('fetchPlayByPlay maps TypeError to network/cors guidance', async () => {
  const fetchImpl = async () => {
    throw new TypeError('fetch failed');
  };

  await assert.rejects(
    () => fetchPlayByPlay('123', fetchImpl),
    /NBA feed unavailable \(network\/CORS\)/
  );
});

test('fetchScoreboard treats 404 as no-games day instead of hard error', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 404,
    async json() {
      return {};
    }
  });

  const scoreboard = await fetchScoreboard(fetchImpl);
  assert.deepEqual(scoreboard, { scoreboard: { games: [] } });
});

test('fetchPlayByPlay treats 404 as empty timeline instead of hard error', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 404,
    async json() {
      return {};
    }
  });

  const play = await fetchPlayByPlay('missing-game', fetchImpl);
  assert.deepEqual(play, { game: { actions: [] } });
});

test('normalizeGames keeps scoreboard gameDate on each game', () => {
  const games = normalizeGames(scoreboardFixture);
  assert.equal(games[0].gameDate, '2026-04-08');
});

test('fetchUpcomingGames returns upcoming scheduled games from schedule feed', async () => {
  let callCount = 0;
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    async json() {
      callCount += 1;
      return {
        events: [
          {
            id: callCount === 1 ? 'g100' : 'g200',
            date: callCount === 1 ? '2026-04-13T23:00:00Z' : '2026-04-14T00:00:00Z',
            competitions: [
              {
                status: { type: { state: 'pre', shortDetail: callCount === 1 ? '7:00 PM ET' : '8:00 PM ET' } },
                competitors: [
                  { homeAway: 'home', team: { id: '1', abbreviation: callCount === 1 ? 'CLE' : 'BOS', displayName: 'Home Team' }, score: '0' },
                  { homeAway: 'away', team: { id: '2', abbreviation: callCount === 1 ? 'ATL' : 'NYK', displayName: 'Away Team' }, score: '0' }
                ]
              }
            ]
          }
        ]
      };
    }
  });

  const games = await fetchUpcomingGames(2, fetchImpl);
  assert.equal(games.length, 2);
  assert.equal(games[0].away.code, 'ATL');
  assert.equal(games[1].home.code, 'BOS');
});

test('fetchUpcomingGames keeps bracket placeholder labels from schedule feed', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        events: [
          {
            id: 'g500',
            date: '2026-04-13T23:00:00Z',
            competitions: [
              {
                status: { type: { state: 'pre', shortDetail: '4/13 - 7:30 PM EDT' } },
                competitors: [
                  { homeAway: 'home', team: { id: '1', abbreviation: 'PHX' }, score: '0' },
                  { homeAway: 'away', team: { id: '2', abbreviation: 'Clippers/Trail Blazers' }, score: '0' }
                ]
              }
            ]
          }
        ]
      };
    }
  });

  const games = await fetchUpcomingGames(1, fetchImpl);
  assert.equal(games.length, 1);
  assert.equal(games[0].away.code, 'Clippers/Trail Blazers');
});

test('fetchUpcomingGames skips failed date fetches instead of throwing', async () => {
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    if (callCount === 1) {
      throw new TypeError('network down');
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          scoreboard: {
            gameDate: '2026-04-14',
            games: [
              {
                gameId: 'g300',
                gameStatus: 1,
                gameStatusText: '9:00 pm ET',
                homeTeam: { teamTricode: 'DEN', score: 0 },
                awayTeam: { teamTricode: 'PHX', score: 0 }
              }
            ]
          }
        };
      }
    };
  };

  const games = await fetchUpcomingGames(2, fetchImpl);
  assert.ok(games.length >= 1);
  assert.equal(games[0].away.code, 'PHX');
});

test('fetchUpcomingGames falls back to scoreboard format when schedule feed is empty', async () => {
  const fetchImpl = async (_url) => ({
    ok: true,
    status: 200,
    async json() {
      return {
        scoreboard: {
          gameDate: '2026-04-14',
          games: [
            {
              gameId: 'g400',
              gameStatus: 1,
              gameStatusText: '10:00 pm ET',
              homeTeam: { teamTricode: 'LAC', score: 0 },
              awayTeam: { teamTricode: 'SAC', score: 0 }
            }
          ]
        }
      };
    }
  });

  const games = await fetchUpcomingGames(1, fetchImpl);
  assert.equal(games.length, 1);
  assert.equal(games[0].home.code, 'LAC');
});

test('fetchUpcomingGames returns games in ascending start-time order', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        events: [
          {
            id: 'late',
            date: '2026-04-13T23:30:00Z',
            competitions: [{ status: { type: { state: 'pre', shortDetail: '7:30 PM ET' } }, competitors: [] }]
          },
          {
            id: 'early',
            date: '2026-04-13T21:00:00Z',
            competitions: [{ status: { type: { state: 'pre', shortDetail: '5:00 PM ET' } }, competitors: [] }]
          }
        ]
      };
    }
  });

  const games = await fetchUpcomingGames(1, fetchImpl);
  assert.equal(games[0].gameId, 'early');
  assert.equal(games[1].gameId, 'late');
});
