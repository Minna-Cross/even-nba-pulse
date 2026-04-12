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
