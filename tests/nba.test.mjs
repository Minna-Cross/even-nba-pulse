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
