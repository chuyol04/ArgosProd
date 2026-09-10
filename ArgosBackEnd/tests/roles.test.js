import test from 'node:test';
import assert from 'node:assert/strict';
import { isInspectorOnly } from '../lib/constants/roles.js';
import { blockInspectorCatalogWrites } from '../middleware/clientGuard.js';

test('Inspector-only users are restricted without reducing Manager/Admin access', () => {
  assert.equal(isInspectorOnly(['Inspector']), true);
  assert.equal(isInspectorOnly(['Inspector', 'Manager']), false);
  assert.equal(isInspectorOnly(['Inspector', 'Admin']), false);
  assert.equal(isInspectorOnly(['Cliente']), false);
});

test('administrative writes are blocked only for Inspector-only users', async () => {
  const response = (roles) => {
    const state = { status: null, body: null };
    return {
      state,
      locals: { requester: { roles } },
      status(code) { state.status = code; return this; },
      json(body) { state.body = body; return this; },
    };
  };

  const inspectorResponse = response(['Inspector']);
  let inspectorNext = false;
  await blockInspectorCatalogWrites({ method: 'POST' }, inspectorResponse, () => { inspectorNext = true; });
  assert.equal(inspectorResponse.state.status, 403);
  assert.equal(inspectorNext, false);

  const clientResponse = response(['Cliente']);
  let clientNext = false;
  await blockInspectorCatalogWrites({ method: 'POST' }, clientResponse, () => { clientNext = true; });
  assert.equal(clientResponse.state.status, null);
  assert.equal(clientNext, true);
});
