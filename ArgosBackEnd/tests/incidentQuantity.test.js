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

function mockDatabase(t, {
  boxes = { 11: 9, 12: 5 },
  assigned = {},
  linkedDefects = { 20: 'Rebaba', 21: 'Falta de material' },
  existing = { id: 3, defect_id: 20, inspection_detail_id: 7, inspection_detail_serial_number_id: 11, quantity: 4 },
} = {}) {
  const writes = [];
  t.mock.method(MysqlClient, 'execute', async (sql, params) => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();
    if (normalizedSql.includes('FROM inspection_detail_serial_numbers box')) {
      const [defectId, boxId, detailId] = params;
      assert.equal(detailId, 7);
      if (!Object.hasOwn(boxes, boxId) || !Object.hasOwn(linkedDefects, defectId)) return [[]];
      return [[{ rejected_pieces: boxes[boxId], defect_name: linkedDefects[defectId] }]];
    }
    if (normalizedSql.includes('COALESCE(SUM(quantity), 0)')) {
      const [detailId, boxId, excludedId] = params;
      assert.equal(detailId, 7);
      if (excludedId !== undefined) assert.equal(excludedId, 3);
      return [[{ assigned_quantity: assigned[boxId] || 0 }]];
    }
    if (normalizedSql.includes('FROM incidents WHERE id = ?')) return [[existing]];
    writes.push({ sql: normalizedSql, params });
    return [{ insertId: 3, affectedRows: 1 }];
  });
  return writes;
}

test('create keeps the entered quantity so one box can be split across defects', async (t) => {
  const writes = mockDatabase(t);
  for (const [defectId, quantity, label] of [[20, 4, 'Rebaba'], [21, 5, 'Falta de material']]) {
    const res = response();
    await createIncidencia({ body: {
      inspection_detail_id: 7,
      inspection_detail_serial_number_id: 11,
      defect_id: defectId,
      quantity,
      evidence_url: 'photo-id',
    } }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(writes.at(-1).params, [defectId, label, 7, 11, quantity, 'photo-id']);
  }
});

test('create rejects quantities that exceed the unassigned rejected pieces', async (t) => {
  const writes = mockDatabase(t, { assigned: { 11: 4 } });
  const accepted = response();
  await createIncidencia({ body: {
    inspection_detail_id: 7, inspection_detail_serial_number_id: 11,
    defect_id: 21, quantity: 5,
  } }, accepted);
  assert.equal(accepted.statusCode, 201);

  const rejected = response();
  await createIncidencia({ body: {
    inspection_detail_id: 7, inspection_detail_serial_number_id: 11,
    defect_id: 21, quantity: 6,
  } }, rejected);
  assert.equal(rejected.statusCode, 400);
  assert.equal(writes.length, 1);
});

test('create requires a linked defect, a valid box, and a positive integer quantity', async (t) => {
  const writes = mockDatabase(t);
  const payloads = [
    { defect_id: 20, inspection_detail_serial_number_id: undefined, quantity: 1 },
    { defect_id: 20, inspection_detail_serial_number_id: 999, quantity: 1 },
    { defect_id: undefined, inspection_detail_serial_number_id: 11, quantity: 1 },
    { defect_id: 99, inspection_detail_serial_number_id: 11, quantity: 1 },
    { defect_id: 20, inspection_detail_serial_number_id: 11, quantity: 0 },
    { defect_id: 20, inspection_detail_serial_number_id: 11, quantity: 1.5 },
  ];
  for (const payload of payloads) {
    const res = response();
    await createIncidencia({ body: { inspection_detail_id: 7, ...payload } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(writes.length, 0);
});

test('editing validates the new distribution and keeps the catalog label', async (t) => {
  const writes = mockDatabase(t, { assigned: { 12: 1 } });
  const res = response();
  await updateIncidencia({ params: { id: 3 }, body: {
    defect_id: 21,
    inspection_detail_serial_number_id: 12,
    quantity: 4,
    evidence_url: 'new-photo',
  } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(writes[0].params, [21, 'Falta de material', 7, 12, 4, 'new-photo', 3]);
});

test('quantity-only edits exclude the current incident from the assigned total', async (t) => {
  const writes = mockDatabase(t, { assigned: { 11: 5 } });
  const res = response();
  await updateIncidencia({ params: { id: 3 }, body: { quantity: 4 } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(writes[0].params, [20, 'Rebaba', 7, 11, 4, 3]);
});

test('editing cannot detach the linked defect, box, or exceed the remaining quantity', async (t) => {
  const writes = mockDatabase(t, { assigned: { 11: 6 } });
  for (const payload of [
    { defect_id: null },
    { inspection_detail_serial_number_id: null },
    { quantity: 4 },
  ]) {
    const res = response();
    await updateIncidencia({ params: { id: 3 }, body: payload }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(writes.length, 0);
});

test('evidence-only updates preserve historical assignments', async (t) => {
  const writes = mockDatabase(t);
  const res = response();
  await updateIncidencia({ params: { id: 3 }, body: { evidence_url: null } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(writes[0].sql, 'UPDATE incidents SET evidence_url = ? WHERE id = ?');
  assert.deepEqual(writes[0].params, [null, 3]);
});
