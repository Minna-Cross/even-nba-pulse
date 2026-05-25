import test from 'node:test';
import assert from 'node:assert/strict';
import scoreboardFixture from './fixtures/scoreboard.fixture.json' with { type: 'json' };
import playFixture from './fixtures/playbyplay.fixture.json' with { type: 'json' };

import {
  chooseDefaultGameIndex,
  fetchPlayByPlay,
  fetchScoreboard,
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
  assert.equal(plays[0].clock, 'PT10M53.00S');
  assert.equal(plays[3].awayScore, 84);
  assert.equal(plays[3].homeScore, 87);
});

test('normalizeActions extracts ESPN summary plays', () => {
  const plays = normalizeActions({
    plays: [
      {
        id: '4018732009',
        sequenceNumber: '9',
        text: "Victor Wembanyama makes 27-foot three point jumper (De'Aaron Fox assists)",
        awayScore: 0,
        homeScore: 3,
        period: { number: 1, displayValue: '1st Quarter' },
        clock: { displayValue: '11:36' }
      },
      {
        id: '40187320056',
        sequenceNumber: '56',
        text: 'Jared McCain enters the game for Cason Wallace',
        awayScore: 8,
        homeScore: 10,
        period: { number: 1, displayValue: '1st Quarter' },
        clock: { displayValue: '7:26' }
      }
    ]
  });

  assert.equal(plays.length, 2);
  assert.equal(plays[0].actionNumber, 9);
  assert.equal(plays[0].clock, '11:36');
  assert.equal(plays[1].description, 'Jared McCain enters the game for Cason Wallace');
  assert.equal(plays[1].awayScore, 8);
  assert.equal(plays[1].homeScore, 10);
});

test('sortPlays returns descending order (newest first)', () => {
  const plays = normalizeActions(playFixture);
  const sorted = sortPlays(plays);

  assert.equal(sorted[0].actionNumber, 151);
  assert.equal(sorted.at(-1).actionNumber, 4);
});

test('paginate returns stable page windows', () => {
  const plays = sortPlays(normalizeActions(playFixture));
  const page = paginate(plays, 0, 2);
  assert.equal(page.totalPages, 2);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].actionNumber, 151);
});

test('formatPlayLine produces compact timeline text', () => {
  const plays = normalizeActions(playFixture);
  const line = formatPlayLine(plays[2]);
  assert.match(line, /Q3/);
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

test('fetchPlayByPlay falls back to ESPN summary when proxy is blocked', async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    if (url.includes('/playbyplay/')) {
      return new Response('<HTML><HEAD><TITLE>Access Denied</TITLE></HEAD></HTML>', {
        status: 403,
        statusText: 'Forbidden'
      });
    }

    return new Response(JSON.stringify({
      plays: [
        {
          sequenceNumber: '9',
          text: "Victor Wembanyama makes 27-foot three point jumper (De'Aaron Fox assists)",
          awayScore: 0,
          homeScore: 3,
          period: { number: 1 },
          clock: { displayValue: '11:36' }
        }
      ]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const data = await fetchPlayByPlay('401873200', fetchImpl);

  assert.equal(data.plays.length, 1);
  assert.equal(data.plays[0].text, "Victor Wembanyama makes 27-foot three point jumper (De'Aaron Fox assists)");
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /\/playbyplay\/401873200$/);
  assert.match(requestedUrls[1], /summary\?event=401873200$/);
});

test('fetchPlayByPlay does not leak HTML denial bodies', async () => {
  const fetchImpl = async () =>
    new Response('<HTML><HEAD><TITLE>Access Denied</TITLE></HEAD><BODY>blocked</BODY></HTML>', {
      status: 403,
      statusText: 'Forbidden'
    });

  await assert.rejects(
    () => fetchPlayByPlay('401873200', fetchImpl),
    (error) => {
      assert.match(error.message, /Play-by-play request failed \(403 Forbidden\)/);
      assert.doesNotMatch(error.message, /<HTML>|Access Denied|blocked/);
      return true;
    }
  );
});
