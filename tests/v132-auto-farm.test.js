import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Farm from '../dist/v13-rules.js';
import { createGame, getActions } from '../dist/engine-v13.js';

test('hired workers have an automatic daily farm-work entry point independent of current action', () => {
  assert.equal(typeof Farm.recordHiredWorkerDay, 'function');

  const state = {
    seed: 20260910,
    year: 290,
    month: 3,
    day: 2,
    phase: 'playing',
    endpoint: false,
    running: true,
    pendingEvent: null,
    pauseReason: null,
    currentActivity: { id: 'trade', kind: 'routine', elapsed: 3 },
    region: '洛阳近郊',
    grainPrice: 1,
    family: { id: 'family-1', cohesion: 65, households: [{ assets: [] }] },
    household: { land: 8, money: 100, grain: 100, location: '洛阳近郊' },
    resources: { money: 100, grain: 100, land: 8, hunger: 0 },
    people: {
      p1: { id: 'p1', alive: true, age: 30, health: 80, hunger: 0, familyId: 'family-1' }
    },
    eventLog: [],
    agriculture: {
      cropYear: 290,
      springWorkDays: 0,
      summerWorkDays: 0,
      harvestWorkDays: 0,
      sownAcres: 0,
      tendedAcres: 0,
      harvestedGrain: 0,
      harvestedYear: null,
      harvestPlan: null,
      hiredWorkers: 1,
      lastWageMonthKey: '290-3',
      weather: {}
    }
  };

  const result = Farm.recordHiredWorkerDay(state);
  assert.equal(result.source, 'hired');
  assert.equal(result.worked, true);
  assert.equal(result.workAcres, 3);
  assert.equal(state.agriculture.work.hired.springWorkDays, 1);
  assert.equal(state.agriculture.work.family.springWorkDays, 0);
});

test('cultivation is the first action and explicitly means self-and-family farming', () => {
  const state = createGame({ surname: '沈', origin: 'peasant', seed: 123 });
  const actions = getActions(state);
  assert.equal(actions[0].id, 'cultivate');
  assert.match(actions[0].desc, /自己和家人/);
  assert.match(actions[0].desc, /雇工.*自动/);
});

test('family tree rendering uses the compact V1.3.2 geometry', () => {
  const game = fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8');
  const style = fs.readFileSync(new URL('../dist/style.css', import.meta.url), 'utf8');
  assert.match(game, /const nodeSpacing = 94/);
  assert.match(game, /circle\.setAttribute\('r', '16'\)/);
  assert.match(game, /generation \* 56/);
  assert.match(style, /\.family-tree\{[^}]*min-width:360px[^}]*min-height:190px/);
});
