import test from 'node:test';
import assert from 'node:assert/strict';

import { buildView } from '../src/render.js';
import { createInitialState } from '../src/state.js';

test('buildView shows upcoming schedule lines when no live game is selected', () => {
  const state = createInitialState();
  state.games = [];
  state.upcomingGames = [
    {
      gameDate: '2026-04-12',
      startTimeUtc: '2026-04-12T20:00:00Z',
      statusText: '4:00 PM ET',
      away: { code: 'BOS' },
      home: { code: 'NYK' }
    }
  ];

  const view = buildView(state);
  assert.match(view.dom.timeline, /Upcoming schedule/);
  assert.match(view.dom.timeline, /BOS @ NYK/);
  assert.match(view.dom.timeline, /Times shown in your local timezone/);
});
