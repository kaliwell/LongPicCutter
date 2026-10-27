import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundaries, validatePlan, pixelAtPointer } from '../src/cut-plan.js';

test('unsorted marks keep every original pixel row exactly once', () => {
  const insertionOrder = [1511, 333, 1000];
  const points = boundaries(insertionOrder, 2001);
  assert.deepEqual(insertionOrder, [1511, 333, 1000]);
  const rows = points.slice(0, -1).flatMap((y, i) => Array.from({ length: points[i + 1] - y }, (_, j) => y + j));
  assert.deepEqual(rows, Array.from({ length: 2001 }, (_, i) => i));
});
test('plan roundtrip preserves undo order and rejects malformed or mismatched input', () => {
  const image = { width: 790, height: 2001 };
  const plan = { app: 'LongPicCutter', version: 1, image, lines: [1511, 333] };
  assert.deepEqual(validatePlan(JSON.parse(JSON.stringify(plan)), image), plan.lines);
  for (const bad of [null, {}, { ...plan, version: 2 }, { ...plan, image: { width: 800, height: 2001 } }, ...[0, 2001, -1, 2.5, '20', null].map(y => ({ ...plan, lines: [y] }))]) {
    assert.throws(() => validatePlan(bad, image));
  }
});
test('pointer maps scaled and scrolled preview to original integer rows', () => {
  const rect = { left: 100, right: 495, top: -300, bottom: 700, width: 395, height: 1000 };
  assert.equal(pixelAtPointer({ x: 200, y: 200 }, rect, 2000), 1000);
  assert.equal(pixelAtPointer({ x: 90, y: 200 }, rect, 2000), null);
  assert.equal(pixelAtPointer({ x: 200, y: 700 }, rect, 2000), null);
  assert.equal(pixelAtPointer({ x: 200, y: -300 }, rect, 2000), null);
});
