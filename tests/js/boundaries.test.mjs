// Boundary + Control unit tests (node:test). Boundaries receive stub views/controls, so these run
// without a browser or server. Test names start with the report's Test Case IDs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rules, todaySGT, strongPassword } from '../../js/controllers/rules.js';
import { CreateUserProfileC } from '../../js/controllers/CreateUserProfileC.js';
import { SaveFavouriteC } from '../../js/controllers/SaveFavouriteC.js';
import { LoginC } from '../../js/controllers/LoginC.js';
import { GenerateWeeklyReportC } from '../../js/controllers/GenerateWeeklyReportC.js';
import { SearchUserProfileForm } from '../../js/boundaries/SearchUserProfileForm.js';

const CASES = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url)));

function stubView(confirmAnswer = true) {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls, success: rec('success'), error: rec('error'), cancel: rec('cancel'), show: rec('show'),
    results: rec('results'), noResults: rec('noResults'), list: rec('list'), count: rec('count'),
    home: rec('home'), login: rec('login'), report: rec('report'), noData: rec('noData'),
    confirm: async (m) => { calls.push(['confirm', m]); return confirmAnswer; }, customerId: () => 'a3',
  };
}
const trapControl = () => new Proxy({ error: '' }, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return () => { throw new Error(`Control.${String(prop)} must not be called`); };
  },
});

for (const [id, c] of Object.entries(CASES)) {
  test(`${id}: ${c.scenario}`, async () => {
    const mod = await import(`../../js/boundaries/${c.boundary}.js`);
    const Boundary = mod[c.boundary];
    if (c.kind === 'cancel') {
      const view = stubView();
      const result = new Boundary(view, trapControl()).OnCancel();
      assert.equal(result, false);
      assert.deepEqual(view.calls, [['cancel']]);
    } else if (c.kind === 'suspendCancel') {
      const view = stubView(false);
      const result = await new Boundary(view, trapControl()).OnSuspend('x1');
      assert.equal(result, false);
      assert.equal(view.calls.length, 1);
      assert.equal(view.calls[0][0], 'confirm');
    } else if (c.kind === 'nodata') {
      const view = stubView();
      const control = { error: '', GenerateDailyReport: async () => ({ reportType: 'Daily', noData: true }) };
      await new Boundary(view, control).OnGenerate('2020-01-01');
      assert.deepEqual(view.calls.map((x) => x[0]), ['noData']);
    } else if (c.kind === 'logout') {
      const view = stubView();
      await new Boundary(view, { error: '', Logout: async () => false }).OnLogout();
      assert.deepEqual(view.calls.map((x) => x[0]), ['login']);
    }
  });
}

// ---- TDD: front-end Control rules (written first, then rules.js was implemented) ----
test('TDD rules.profile rejects empty permissions and bad role names', () => {
  assert.match(rules.profile('Auditor', 'Reviews', []), /at least one permission/);
  assert.match(rules.profile('1nvalid', 'x', ['MANAGE_IDP']), /Role must be/);
  assert.equal(rules.profile('Auditor', 'Reviews accounts', ['MANAGE_ACCOUNTS']), '');
});

test('TDD strongPassword enforces length and character classes', () => {
  assert.equal(strongPassword('Demo1234!'), true);
  for (const weak of ['short1!', 'alllowercase1!', 'NoDigits!!', 'NoSymbol123', 'x'.repeat(65) + 'A1!']) assert.equal(strongPassword(weak), false);
});

test('TDD rules.company validates Singapore UEN and phone formats', () => {
  const ok = ['Atelier', '201912345K', 'Tanjong Pagar', '62223333', 'a@b.sg', 'Design'];
  assert.equal(rules.company(...ok), '');
  assert.match(rules.company('Atelier', '12345', 'x', '62223333', 'a@b.sg', 'd'), /UEN/);
  assert.match(rules.company('Atelier', '201912345K', 'x', '1234', 'a@b.sg', 'd'), /Phone/);
  assert.equal(rules.company('Atelier', '', 'x', '+65 91234567', 'a@b.sg', 'd', { creating: false }), '');
});

test('TDD rules.idp blocks future completion dates for past IDPs', () => {
  const tomorrow = new Date(Date.parse(todaySGT()) + 86400000).toISOString().slice(0, 10);
  assert.match(rules.idp('T', 'D', 'cat1', ['https://x/y.jpg'], tomorrow, { past: true }), /future/);
  assert.equal(rules.idp('T', 'D', 'cat1', ['https://x/y.jpg'], todaySGT(), { past: true }), '');
  assert.match(rules.idp('T', 'D', 'cat1', [], null), /required/);
});

test('TDD rules.period enforces weekly span and order', () => {
  const t = todaySGT();
  const minus = (d) => new Date(Date.parse(t) - d * 86400000).toISOString().slice(0, 10);
  assert.equal(rules.period(minus(6), t, 7), '');
  assert.match(rules.period(minus(9), t, 7), /at most 7/);
  assert.match(rules.period(t, minus(2), 7), /on or before/);
});

test('Control stops before the Entity when validation fails', async () => {
  const entity = { CreateUserProfile: async () => { throw new Error('should not be called'); } };
  const c = new CreateUserProfileC(entity);
  assert.equal(await c.CreateUserProfile('', '', []), false);
  assert.match(c.error, /required/);
});

test('SaveFavouriteC increments the shortlist only after AddFavourite succeeds', async () => {
  const log = [];
  const fav = { lastError: 'This IDP is already in your favourites.', AddFavourite: async () => { log.push('add'); return false; } };
  const idp = { IncrementShortlistCount: async () => { log.push('inc'); return true; } };
  const c = new SaveFavouriteC(fav, idp);
  assert.equal(await c.SaveFavourite('a3', 'idp1'), false);
  assert.deepEqual(log, ['add']);
  assert.match(c.error, /already/);
  fav.AddFavourite = async () => { log.push('add'); return true; };
  assert.equal(await c.SaveFavourite('a3', 'idp4'), true);
  assert.deepEqual(log, ['add', 'add', 'inc']);
});

test('LoginC trims the username and never calls Authenticate with blanks', async () => {
  const seen = [];
  const c = new LoginC({ lastError: '', Authenticate: async (u, p) => { seen.push([u, p]); return true; } });
  assert.equal(await c.Login('  ', ''), false);
  assert.equal(await c.Login('  shiyuan ', 'Demo1234!'), true);
  assert.deepEqual(seen, [['shiyuan', 'Demo1234!']]);
});

test('GenerateWeeklyReportC returns null and an error for an invalid period', async () => {
  const c = new GenerateWeeklyReportC({ BuildWeeklyReport: async () => { throw new Error('not reached'); } });
  assert.equal(await c.GenerateWeeklyReport('', ''), null);
  assert.match(c.error, /select the report period/);
});

test('SearchUserProfileForm shows an error for an empty keyword without calling the Control', async () => {
  const view = stubView();
  const results = await new SearchUserProfileForm(view, trapControl()).OnSearch('   ');
  assert.deepEqual(results, []);
  assert.deepEqual(view.calls, [['error', 'Please enter a search keyword.']]);
});
