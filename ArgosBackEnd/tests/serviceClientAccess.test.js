import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import MysqlClient from '../connections/mysqldb.js';
import { createServicio, updateServicio } from '../handlers/servicioHandler.js';

after(() => MysqlClient.end());

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

function mockConnection(t, { eligibleIds = [4, 7], existingClientId = 2 } = {}) {
  const events = [];
  const writes = [];
  const connection = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    execute: async (sql, params) => {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      if (normalizedSql.startsWith('SELECT id FROM clients')) return [[{ id: 2 }]];
      if (normalizedSql.startsWith('SELECT id, client_id FROM services')) {
        return [[{ id: 9, client_id: existingClientId }]];
      }
      if (normalizedSql.startsWith('SELECT DISTINCT u.id')) {
        return [eligibleIds.map((id) => ({ id }))];
      }
      writes.push({ sql: normalizedSql, params });
      if (normalizedSql.startsWith('INSERT INTO services')) return [{ insertId: 9 }];
      return [{ affectedRows: 1 }];
    },
  };
  t.mock.method(MysqlClient, 'getConnection', async () => connection);
  return { events, writes };
}

test('service creation stores several eligible client users atomically', async (t) => {
  const { events, writes } = mockConnection(t);
  const res = response();

  await createServicio({ body: {
    client_id: 2,
    name: 'Sorting A',
    start_date: '2026-10-21',
    client_user_ids: [4, 7, 4],
  } }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(events, ['begin', 'commit', 'release']);
  const accessInsert = writes.find((write) => write.sql.startsWith('INSERT INTO service_client_users'));
  assert.deepEqual(accessInsert.params, [9, 4, 9, 7]);
});

test('service creation rejects users outside the owning client and rolls back', async (t) => {
  const { events, writes } = mockConnection(t, { eligibleIds: [4] });
  const res = response();

  await createServicio({ body: {
    client_id: 2,
    start_date: '2026-10-21',
    client_user_ids: [4, 7],
  } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(events, ['begin', 'rollback', 'release']);
  assert.equal(writes.some((write) => write.sql.startsWith('INSERT INTO services')), false);
});

test('service update replaces portal access without changing unrelated fields', async (t) => {
  const { events, writes } = mockConnection(t, { eligibleIds: [7] });
  const res = response();

  await updateServicio({ params: { id: '9' }, body: { client_user_ids: [7] } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(events, ['begin', 'commit', 'release']);
  assert.equal(writes.some((write) => write.sql.startsWith('UPDATE services')), false);
  assert.deepEqual(
    writes.find((write) => write.sql.startsWith('INSERT INTO service_client_users')).params,
    ['9', 7]
  );
});
