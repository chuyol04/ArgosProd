import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInspectionBox, normalizeInspectionBoxes } from '../lib/helpers/inspectionBoxHelpers.js';
import MysqlClient from '../connections/mysqldb.js';
import { createDetalleInspeccion, addSerialNumber, updateSerialNumber, updateDetalleInspeccion } from '../handlers/detalleInspeccionHandler.js';

const box = { serial_number: '', lot_number: '7015256760', inspected_pieces: 840, rejected_pieces: 2, reworked_pieces: 0 };
const request = () => ({ body: {
  inspection_report_id: 1, inspector_id: 2, shift: '1',
  inspection_date: '2026-09-27', manufacture_date: '2026-09-24',
  start_time: '08:00', end_time: '16:00', hours: 8,
  serial_lots: [{ ...box }],
} });
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

after(() => MysqlClient.end());

test('lot only, series only and both are valid; accepted is always calculated', () => {
  for (const identity of [{ serial_number: '', lot_number: '7015256760' }, { serial_number: 'sn-1', lot_number: '' }, { serial_number: ' sn-1 ', lot_number: ' lot-1 ' }]) {
    const result = normalizeInspectionBox({ ...box, ...identity, inspected_pieces: '0840', rejected_pieces: '02', accepted_pieces: 999 });
    assert.equal(result.inspected_pieces, 840);
    assert.equal(result.accepted_pieces, 838);
    assert.equal(result.serial_number, identity.serial_number.trim().toUpperCase());
  }
});

test('rejects missing identifiers, invalid counts and rejected greater than inspected', () => {
  assert.throws(() => normalizeInspectionBox({ ...box, lot_number: ' ' }), /serie o un lote/);
  for (const field of ['inspected_pieces', 'rejected_pieces', 'reworked_pieces']) {
    for (const invalid of [-1, 1.5, NaN, Infinity, '', ' ', null, undefined, false, [], {}, 'abc', 2147483648]) {
      assert.throws(() => normalizeInspectionBox({ ...box, [field]: invalid }), { status: 400 });
    }
  }
  assert.throws(() => normalizeInspectionBox({ ...box, rejected_pieces: 841 }), /no puede superar/);
  assert.equal(normalizeInspectionBox({ ...box, rejected_pieces: 840 }).accepted_pieces, 0);
  assert.equal(normalizeInspectionBox({ ...box, inspected_pieces: 0, rejected_pieces: 0 }).accepted_pieces, 0);
});

test('keeps lot-only boxes in order, even repeated lots; rejects rather than drops invalid rows', () => {
  const result = normalizeInspectionBoxes([box, { ...box, lot_number: 'OTHER' }, box]);
  assert.deepEqual(result.map((item) => item.lot_number), ['7015256760', 'OTHER', '7015256760']);
  assert.throws(() => normalizeInspectionBoxes([box, { ...box, lot_number: '' }]), /serie o un lote/);
  assert.throws(() => normalizeInspectionBoxes([{ ...box, serial_number: 'SN' }, { ...box, serial_number: 'sn' }]), /ya fue agregado/);
  assert.throws(() => normalizeInspectionBoxes([]), /al menos una caja/);
  assert.throws(() => normalizeInspectionBoxes(Array(21).fill(box)), /máximo de 20/);
});

test('create persists NULL series, numeric counts and calculated totals in one transaction', async (t) => {
  t.mock.method(MysqlClient, 'execute', async () => [[{ id: 1 }]]);
  const writes = [];
  const events = [];
  t.mock.method(MysqlClient, 'getConnection', async () => ({
    beginTransaction: async () => events.push('begin'),
    execute: async (sql, values) => { writes.push({ sql, values }); return [{ insertId: writes.length }]; },
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  }));
  const req = request();
  req.body.serial_lots = [box, box];
  const res = response();
  await createDetalleInspeccion(req, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(events, ['begin', 'commit', 'release']);
  assert.deepEqual(writes[0].values.slice(8, 12), [1680, 1676, 4, 0]);
  assert.deepEqual(writes[1].values, [1, null, '7015256760', 840, 838, 2, 0]);
  assert.deepEqual(res.body.serial_numbers.map((item) => item.id), [2, 3]);
});

test('create rejects invalid rows and required fields without writing', async (t) => {
  t.mock.method(MysqlClient, 'execute', async (sql) => { assert.match(sql, /^SELECT/); return [[{ id: 1 }]]; });
  t.mock.method(MysqlClient, 'getConnection', () => assert.fail('Must not write'));
  for (const override of [
    { inspector_id: null }, { inspection_report_id: 0 }, { shift: '' },
    { inspection_date: '' }, { manufacture_date: '2026-02-30' },
    { start_time: '25:00' }, { end_time: '07:00' },
    { serial_lots: [box, { ...box, lot_number: '' }] },
    { serial_lots: [{ ...box, rejected_pieces: 841 }] },
  ]) {
    const req = request();
    Object.assign(req.body, override);
    const res = response();
    await createDetalleInspeccion(req, res);
    assert.equal(res.statusCode, 400, JSON.stringify(override));
  }
});

test('create rolls back the detail if inserting a box fails', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(MysqlClient, 'execute', async () => [[{ id: 1 }]]);
  const events = [];
  t.mock.method(MysqlClient, 'getConnection', async () => ({
    beginTransaction: async () => events.push('begin'),
    execute: async (sql) => {
      if (sql.includes('INSERT INTO inspection_detail_serial_numbers')) throw new Error('Insert failed');
      return [{ insertId: 1 }];
    },
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  }));
  const res = response();
  await createDetalleInspeccion(request(), res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(events, ['begin', 'rollback', 'release']);
});

test('add and edit use the same validation and calculated accepted count', async (t) => {
  const writes = [];
  t.mock.method(MysqlClient, 'execute', async (sql, values) => {
    if (sql.includes('COUNT(*) AS total FROM')) return [[{ total: 0 }]];
    if (sql.includes('COUNT(*) AS total_boxes')) return [[{ total_boxes: 1, complete_boxes: 1, inspected_pieces: 840, accepted_pieces: 838, rejected_pieces: 2, reworked_pieces: 0 }]];
    if (sql.includes('AND serial_number =')) return [[]];
    if (sql.startsWith('SELECT id FROM')) return [[{ id: 1 }]];
    writes.push({ sql, values });
    return [{ affectedRows: 1, insertId: 7 }];
  });
  for (const handler of [addSerialNumber, updateSerialNumber]) {
    const res = response();
    await handler({ params: { id: 1, serialId: 7 }, body: { ...box, accepted_pieces: 999 } }, res);
    assert.equal(res.body.success, true);
    assert.equal(res.body.accepted_pieces, 838);
    assert.equal(res.body.serial_number, '');
    const before = writes.length;
    const invalid = response();
    await handler({ params: { id: 1, serialId: 7 }, body: { ...box, rejected_pieces: 841 } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(writes.length, before);
  }
  assert.equal(writes[0].values[1], null);
  assert.equal(writes[2].values[0], null);
});

test('detail update cannot bypass quantity validation', async (t) => {
  t.mock.method(MysqlClient, 'execute', async (sql) => {
    assert.match(sql, /^SELECT/);
    return [[{ id: 1, ...box }]];
  });
  const res = response();
  await updateDetalleInspeccion({ params: { id: 1 }, body: { rejected_pieces: 841 } }, res);
  assert.equal(res.statusCode, 400);
});
