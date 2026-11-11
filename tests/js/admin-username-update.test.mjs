// US8: update a username through User Admin's existing account-edit flow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateUserAccountForm } from '../../js/boundaries/UpdateUserAccountForm.js';
import { UpdateUserAccountC } from '../../js/controllers/UpdateUserAccountC.js';
import { UserAccount } from '../../js/entities/UserAccount.js';

test('US8 Boundary forwards edited username to the Control', async () => {
  const calls = [];
  const view = { success: () => calls.push('success'), error: () => calls.push('error') };
  const control = { UpdateUserAccount: async (...args) => { calls.push(args); return true; } };
  const ok = await new UpdateUserAccountForm(view, control).OnUpdate('a6', 'bryan@limkopi.test', '', 'up-customer', 'bryannew');
  assert.equal(ok, true);
  assert.deepEqual(calls, [['a6', 'bryan@limkopi.test', '', 'up-customer', 'bryannew'], 'success']);
});

test('US8 Control validates the edited username before sending to the Entity', async () => {
  const calls = [];
  const entity = { UpdateUserAccount: async (...args) => { calls.push(args); return true; } };
  const control = new UpdateUserAccountC(entity);
  assert.equal(await control.UpdateUserAccount('a6', 'bryan@limkopi.test', '', 'up-customer', 'bad username'), false);
  assert.equal(calls.length, 0);
  assert.match(control.error, /Username must/);
  assert.equal(await control.UpdateUserAccount('a6', 'bryan@limkopi.test', '', 'up-customer', ' bryannew '), true);
  assert.deepEqual(calls, [['a6', 'bryan@limkopi.test', '', 'up-customer', '', 'bryannew']]);
});

test('US8 Entity includes username in PUT body without changing other fields', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (path, options) => {
    request = { path, options };
    return { ok: true, json: async () => ({ ok: true }) };
  };
  try {
    assert.equal(await UserAccount.UpdateUserAccount('a6', 'bryan@limkopi.test', '', 'up-customer', '', 'bryannew'), true);
    assert.equal(request.path, '/api/records/accounts/a6');
    assert.equal(request.options.method, 'PUT');
    assert.deepEqual(JSON.parse(request.options.body), {
      email: 'bryan@limkopi.test', password: '', confirmPassword: '', profileId: 'up-customer', name: '', username: 'bryannew'
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
