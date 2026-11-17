import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/generate.js';
import { reconcile } from '../src/reconcile.js';

const d = generate({ seed: 42 });
const r = reconcile(d.platform, d.bank);
const ofType = (t) => r.gaps.filter((g) => g.type === t);

test('timing: sale settling next month is flagged with its full amount', () => {
  const g = ofType('timing');
  assert.equal(g.length, 1);
  assert.equal(g[0].id, d.planted.timing.id);
  assert.equal(g[0].amount, d.planted.timing.amount);
});

test('rounding: 1-paisa differences only show up as one summed gap', () => {
  const g = ofType('rounding');
  assert.equal(g.length, 1);
  assert.equal(g[0].amount, d.planted.rounding.total);
  assert.match(g[0].id, new RegExp(`^${d.planted.rounding.count} settlements`));
});

test('duplicate: the repeated bank entry is flagged for its extra amount', () => {
  const g = ofType('duplicate');
  assert.equal(g.length, 1);
  assert.equal(g[0].id, d.planted.duplicate.id);
  assert.equal(g[0].amount, -d.planted.duplicate.amount);
});

test('orphan refund: bank refund with no platform record is flagged', () => {
  const g = ofType('orphan_refund');
  assert.equal(g.length, 1);
  assert.equal(g[0].id, d.planted.orphanRefund.id);
  assert.equal(g[0].amount, -d.planted.orphanRefund.amount);
});

test('every rupee of the difference is explained and nothing is left unclassified', () => {
  assert.equal(r.unexplained, 0);
  assert.equal(ofType('unexplained').length, 0);
  assert.equal(r.gaps.length, 4);
});
