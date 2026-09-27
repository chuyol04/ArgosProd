// Run: node --experimental-strip-types --test tests/inspectionBox.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { boxDefectQuantity, calculateAccepted, validateInspectionBox, pendingBoxKey } from '../src/lib/inspectionBox.ts';

const box = { serial_number: '', lot_number: '7015256760', inspected_pieces: 840, accepted_pieces: 0, rejected_pieces: 2, reworked_pieces: 0 };

test('defect count comes only from the selected box, including lot-only boxes', () => {
  const boxes = [{ ...box, client_id: 'first', rejected_pieces: 9 }, { ...box, client_id: 'second', rejected_pieces: 5 }];
  for (const selected of boxes) {
    assert.equal(boxDefectQuantity(boxes.find((item) => pendingBoxKey(item) === pendingBoxKey(selected))), selected.rejected_pieces);
  }
  assert.equal(boxDefectQuantity(), null);
  assert.equal(boxDefectQuantity({ rejected_pieces: 0 }), 0);
  for (const invalid of [null, undefined, -1, NaN, Infinity, 1.5, '9']) {
    assert.equal(boxDefectQuantity({ rejected_pieces: invalid }), null);
  }
});

test('lot-only, series-only and automatic accepted counts', () => {
  assert.equal(validateInspectionBox(box), null);
  assert.equal(validateInspectionBox({ ...box, serial_number: 'SN', lot_number: '' }), null);
  assert.equal(calculateAccepted(box).accepted_pieces, 838);
  assert.equal(calculateAccepted({ ...box, rejected_pieces: 840 }).accepted_pieces, 0);
  assert.match(validateInspectionBox({ ...box, lot_number: ' ' }), /serie o un lote/);
  assert.match(validateInspectionBox({ ...box, rejected_pieces: 841 }), /no puede superar/);
  for (const field of ['inspected_pieces', 'rejected_pieces', 'reworked_pieces']) {
    for (const count of [-1, 0.5, NaN, Infinity, 2147483648]) {
      assert.match(validateInspectionBox({ ...box, [field]: count }), /enteros no negativos/);
    }
  }
});

test('same lot in multiple boxes has distinct stable defect keys after removal', () => {
  const first = { ...box, client_id: 'box-a' };
  const second = { ...box, client_id: 'box-b' };
  assert.notEqual(pendingBoxKey(first), pendingBoxKey(second));
  const selected = pendingBoxKey(second);
  const remaining = [first, second].filter((item) => item !== first);
  assert.equal(remaining.findIndex((item) => pendingBoxKey(item) === selected), 0);
});
