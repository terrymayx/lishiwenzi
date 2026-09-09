import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, game, css] = await Promise.all([
  readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/game.js', import.meta.url), 'utf8'),
  readFile(new URL('../dist/style.css', import.meta.url), 'utf8')
]);

test('time flow UI exposes a running hourglass and synchronized date/status fields', () => {
  assert.match(html, /id="time-flow"/);
  assert.match(html, /id="flow-date"/);
  assert.match(html, /id="flow-status"/);
  assert.match(game, /renderTimeFlow/);
  assert.match(css, /hourglassFlip/);
});

test('assets UI exposes land purchase controls and hunger details', () => {
  assert.match(game, /buyLand/);
  assert.match(game, /购买田地/);
  assert.match(game, /饥饿/);
});
