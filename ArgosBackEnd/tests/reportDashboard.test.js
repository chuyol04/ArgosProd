import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import MysqlClient from '../connections/mysqldb.js';
import { getReportDashboard } from '../handlers/reportDashboardHandler.js';

after(() => MysqlClient.end());

function response(requester) {
  return {
    locals: { requester },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('dashboard calculates cumulative hours only from assigned client services', async (t) => {
  let executed;
  t.mock.method(MysqlClient, 'execute', async (sql, params) => {
    executed = { sql: sql.replace(/\s+/g, ' ').trim(), params };
    return [[
      { activity_date: '2026-10-21', daily_hours: '2.50', accumulated_hours: '7.50' },
      { activity_date: '2026-10-20', daily_hours: '5.00', accumulated_hours: '5.00' },
    ]];
  });
  const res = response({ id: 7, client_id: 3, roles: ['Cliente'] });

  await getReportDashboard({ query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.total_hours, 7.5);
  assert.deepEqual(res.body.data.hours_history, [
    { date: '2026-10-20', daily_hours: 5, accumulated_hours: 5 },
    { date: '2026-10-21', daily_hours: 2.5, accumulated_hours: 7.5 },
  ]);
  assert.match(executed.sql, /inspection_mode = 'rate'/);
  assert.match(executed.sql, /service_client_users/);
  assert.deepEqual(executed.params, [3, 7]);
});

test('dashboard returns an empty result when a client has no valid scope', async (t) => {
  t.mock.method(MysqlClient, 'execute', async () => {
    throw new Error('deny-all scopes must not query the database');
  });
  const res = response({ roles: ['Cliente'], client_id: 3 });

  await getReportDashboard({ query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, { total_hours: 0, hours_history: [] });
});

test('dashboard rejects valid Firebase sessions without a registered user', async () => {
  const res = response(null);

  await getReportDashboard({ query: {} }, res);

  assert.equal(res.statusCode, 403);
});
