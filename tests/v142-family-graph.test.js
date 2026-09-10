import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../dist/engine-v14.js?v=1.4.1';
import * as FamilyGraph from '../dist/family-work-ui.js?v=1.4.2';

test('new game links the initial mother to the root protagonist', () => {
  const s = E.createGame({ surname: '沈', origin: 'peasant', seed: 142 });
  const root = s.people[s.rootId];
  const mother = Object.values(s.people).find(p => p.role === 'mother');
  assert.ok(mother);
  assert.equal(mother.generation, root.generation - 1);
  assert.ok(root.parentIds.includes(mother.id));
  assert.ok(mother.childrenIds.includes(root.id));
});

test('legacy save repairs the initial mother relation on load', () => {
  const s = E.createGame({ surname: '沈', origin: 'peasant', seed: 143 });
  const root = s.people[s.rootId];
  const mother = Object.values(s.people).find(p => p.role === 'mother');
  root.parentId = null;
  root.parentIds = [];
  mother.childrenIds = [];
  mother.generation = 0;
  const loaded = E.deserializeState(E.serializeState(s));
  const loadedRoot = loaded.people[loaded.rootId];
  const loadedMother = Object.values(loaded.people).find(p => p.role === 'mother');
  assert.equal(loadedMother.generation, loadedRoot.generation - 1);
  assert.ok(loadedRoot.parentIds.includes(loadedMother.id));
  assert.ok(loadedMother.childrenIds.includes(loadedRoot.id));
});

test('family graph renderer defines spouse, shared child branch, and selected relation highlighting', () => {
  const ui = fs.readFileSync(new URL('../dist/family-work-ui.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../dist/v14.css', import.meta.url), 'utf8');
  assert.match(ui, /spouse-line/);
  assert.match(ui, /sibling-line/);
  assert.match(ui, /child-line/);
  assert.match(ui, /data-relatives/);
  assert.match(ui, /spouseId|婚姻/);
  assert.match(css, /\.spouse-line/);
  assert.match(css, /\.relation-line\.related/);
});

test('single-child branch keeps an orthogonal horizontal connector when parent and child are offset', () => {
  assert.equal(typeof FamilyGraph.getFamilyBranchGeometry, 'function');
  const geometry = FamilyGraph.getFamilyBranchGeometry({
    anchorX: 140,
    anchorY: 100,
    childCenters: [70],
    childTop: 152
  });
  assert.equal(geometry.busY, 136);
  assert.equal(geometry.busMinX, 70);
  assert.equal(geometry.busMaxX, 140);
  assert.equal(geometry.needsHorizontalBus, true);
});
