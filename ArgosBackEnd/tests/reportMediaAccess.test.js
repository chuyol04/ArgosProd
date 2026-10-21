import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import MysqlClient from '../connections/mysqldb.js';
import { getAuthorizedReportMedia } from '../handlers/reportMediaAccessHandler.js';

after(() => MysqlClient.end());

const MEDIA_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const MEDIA_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function response(requester) {
  return {
    locals: { requester },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('client media access is limited to explicitly assigned services', async (t) => {
  let executed;
  t.mock.method(MysqlClient, 'execute', async (sql, params) => {
    executed = { sql: sql.replace(/\s+/g, ' ').trim(), params };
    return [[{ media_id: MEDIA_A }]];
  });
  const res = response({ id: 7, client_id: 3, roles: ['Cliente'] });

  await getAuthorizedReportMedia(
    { query: { media_ids: `${MEDIA_A},${MEDIA_B}` } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, [MEDIA_A]);
  assert.match(executed.sql, /s\.client_id = \?/);
  assert.match(executed.sql, /service_client_users/);
  assert.deepEqual(executed.params, [MEDIA_A, MEDIA_B, 3, 7]);
});

test('authenticated staff can read requested media without client scoping', async (t) => {
  t.mock.method(MysqlClient, 'execute', async () => {
    throw new Error('staff authorization must not query the reference tables');
  });
  const res = response({ id: 1, client_id: null, roles: ['Admin'] });

  await getAuthorizedReportMedia(
    { query: { media_ids: `${MEDIA_A},${MEDIA_A},${MEDIA_B}` } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, [MEDIA_A, MEDIA_B]);
});

test('media access rejects valid Firebase sessions without a registered user', async () => {
  const res = response(null);

  await getAuthorizedReportMedia({ query: { media_ids: MEDIA_A } }, res);

  assert.equal(res.statusCode, 403);
});

test('media access rejects malformed identifiers', async () => {
  const res = response({ id: 1, client_id: null, roles: ['Admin'] });

  await getAuthorizedReportMedia({ query: { media_ids: 'not-an-object-id' } }, res);

  assert.equal(res.statusCode, 400);
});
