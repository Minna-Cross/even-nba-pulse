import test from 'node:test';
import assert from 'node:assert/strict';

import { buildView } from '../src/render.js';
import { createInitialState } from '../src/state.js';
import { SPLASH_DURATION_MS } from '../src/lib/constants.js';

test('buildView returns splash content during initial splash window', () => {
  const state = createInitialState();
  state.mockBridge = false;

  const view = buildView(state);

  assert.match(view.glasses.header, /NBA PULSE/);
  assert.match(view.glasses.body, /Loading live scoreboard/);
});

test('buildView exits splash mode after splash window', () => {
  const state = createInitialState();
  state.launchedAt = Date.now() - SPLASH_DURATION_MS - 1;

  const view = buildView(state);

  assert.equal(view.dom.selectedGame, 'No game selected');
  assert.match(view.glasses.header, /NBA Pulse/);
});

test('buildView shows upcoming schedule when no games are live', () => {
  const state = createInitialState();
  state.launchedAt = Date.now() - SPLASH_DURATION_MS - 1;
  state.upcomingGames = [
    {
      gameDate: '2026-04-13',
      gameStatus: 1,
      statusText: '7:00 pm ET',
      home: { code: 'CLE', score: 0 },
      away: { code: 'ATL', score: 0 }
    }
  ];

  const view = buildView(state);
  assert.match(view.dom.timeline, /Next scheduled matchups/);
  assert.match(view.dom.timeline, /ATL @ CLE/);
  assert.match(view.dom.timeline, /Times shown in ET/);
});

test('buildView renders ET and keeps TBD placeholders readable', () => {
  const state = createInitialState();
  state.launchedAt = Date.now() - SPLASH_DURATION_MS - 1;
  state.upcomingGames = [
    {
      gameDate: '2026-04-13',
      gameStatus: 1,
      statusText: '4/13 - 7:30 PM EDT',
      home: { code: 'TBD', score: 0 },
      away: { code: 'TBD', score: 0 }
    }
  ];

  const view = buildView(state);
  assert.match(view.dom.timeline, /TBD @ TBD/);
  assert.match(view.dom.timeline, /7:30 PM ET/);
});
