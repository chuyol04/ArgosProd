import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import MysqlClient from '../connections/mysqldb.js';
import { createIncidencia, updateIncidencia } from '../handlers/incidenciaHandler.js';

after(() => MysqlClient.end());

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

function mockDatabase(t, boxes = { 11: 9, 12: 5 }) {
  const writes = [];
  t.mock.method(MysqlClient, 'execute', async (sql, params) => {
    if (sql.startsWith('SELECT rejected_pieces')) {
      assert.equal(params[1], 7);
      return [Object.hasOwn(boxes, params[0]) ? [{ rejected_pieces: boxes[params[0]] }] : []];
    }
    if (sql.includes('FROM incidents')) {
      return [[{ id: 3, inspection_detail_id: 7, inspection_detail_serial_number_id: 11 }]];
    }
    if (sql.startsWith('SELECT')) return [[{ id: 7 }]];
    writes.push({ sql, params });
    return [{ insertId: 3, affectedRows: 1 }];
  });
  return writes;
}

test('create ignores supplied quantities and uses only the selected box count', async (t) => {
  const writes = mockDatabase(t);
  for (const [boxId, expected] of [[11, 9], [12, 5]]) {
    const res = response();
    await createIncidencia({ body: {
      inspection_detail_id: 7, inspection_detail_serial_number_id: boxId,
      defect_label: 'Rebaba', quantity: -100, evidence_url: 'photo-id',
    } }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(writes.at(-1).params, [null, 'Rebaba', 7, boxId, expected, 'photo-id']);
  }
});

test('create rejects missing/foreign boxes and boxes without valid rejected counts', async (t) => {
  const writes = mockDatabase(t, { 11: 0, 12: -1, 13: null, 14: 1.5 });
  for (const boxId of [undefined, null, 999, 11, 12, 13, 14]) {
    const res = response();
    await createIncidencia({ body: {
      inspection_detail_id: 7, inspection_detail_serial_number_id: boxId, defect_label: 'Rebaba', quantity: 1,
    } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(writes.length, 0);
});

test('editing or changing a box recalculates quantity and preserves evidence', async (t) => {
  const writes = mockDatabase(t);
  const res = response();
  await updateIncidencia({ params: { id: 3 }, body: {
    inspection_detail_serial_number_id: 12, quantity: 999, defect_label: 'Golpe', evidence_url: 'new-photo',
  } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(writes[0].params, ['Golpe', 12, 5, 'new-photo', 3]);
});

test('quantity-only update uses existing box; box-only update also recalculates', async (t) => {
  const writes = mockDatabase(t);
  for (const payload of [{ quantity: -1 }, { inspection_detail_serial_number_id: 12 }]) {
    const res = response();
    await updateIncidencia({ params: { id: 3 }, body: payload }, res);
    assert.equal(res.statusCode, 200);
  }
  assert.deepEqual(writes[0].params, [9, 3]);
  assert.deepEqual(writes[1].params, [12, 5, 3]);
});

test('cannot detach or assign an unavailable/zero-rejected box on edit', async (t) => {
  const writes = mockDatabase(t, { 11: 0 });
  for (const boxId of [null, 999, 11]) {
    const res = response();
    await updateIncidencia({ params: { id: 3 }, body: { inspection_detail_serial_number_id: boxId } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(writes.length, 0);
});

test('removing evidence does not change quantity or require historical per-box counts', async (t) => {
  const writes = mockDatabase(t, {});
  const res = response();
  await updateIncidencia({ params: { id: 3 }, body: { evidence_url: null } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(writes[0].sql, 'UPDATE incidents SET evidence_url = ? WHERE id = ?');
  assert.deepEqual(writes[0].params, [null, 3]);
});
