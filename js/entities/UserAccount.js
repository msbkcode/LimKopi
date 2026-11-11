// Entity: UserAccount — login credentials (username, password, email) linked to a UserProfile.
// Passwords are sent only over the session-protected API and hashed server-side (PBKDF2).
import { api, q, setCsrfToken } from '../api.js';
import { EntityBase } from './EntityBase.js';

export class UserAccount extends EntityBase {
  static current = null;   // the signed-in account (username, role, permissions)

  constructor({ id, username, name, email, profileId, profile, status = 'Active', createdAt, updatedAt } = {}) {
    super();
    Object.assign(this, { accountId: id, id, username, name, email, profileId, profile, status, createdAt, updatedAt });
  }

  static from(row) { return row ? new UserAccount(row) : null; }

  static async CreateUserAccount(username, password, email, profile, name = '') {
    return this.attempt(async () => {
      await api('/api/records/accounts', {
        method: 'POST', body: { username, password, confirmPassword: password, email, profileId: profile, name },
      });
      return true;
    }, false);
  }

  static async GetUserAccount(accountId) {
    return this.attempt(async () => UserAccount.from(await api(`/api/records/accounts/${q(accountId)}`)), null);
  }

  static async GetAllUserAccounts() {
    return this.attempt(async () => (await api('/api/records/accounts')).map(UserAccount.from), []);
  }

  static async UpdateUserAccount(accountId, email, password, profile, name = '') {
    return this.attempt(async () => {
      await api(`/api/records/accounts/${q(accountId)}`, {
        method: 'PUT', body: { email, password, confirmPassword: password, profileId: profile, name },
      });
      return true;
    }, false);
  }

  static async SuspendUserAccount(accountId) {
    return this.attempt(async () => {
      await api(`/api/records/accounts/${q(accountId)}/suspend`, { method: 'POST' });
      return true;
    }, false);
  }

  static async ActivateUserAccount(accountId) {
    return this.attempt(async () => {
      await api(`/api/records/accounts/${q(accountId)}/activate`, { method: 'POST' });
      return true;
    }, false);
  }

  static async FindMatchingUserAccounts(searchKeyword) {
    return this.attempt(async () => (await api(`/api/records/accounts?q=${q(searchKeyword)}`)).map(UserAccount.from), []);
  }

  // 1.11 / 2.6 / 4.6 / 6.9 — Log In
  static async Authenticate(username, password) {
    return this.attempt(async () => {
      const session = await api('/api/login', { method: 'POST', body: { username, password } });
      setCsrfToken(session.csrfToken);
      UserAccount.current = session.user;
      return true;
    }, false);
  }

  static async RestoreSession() {
    return this.attempt(async () => {
      const session = await api('/api/session');
      if (!session.user) return false;
      setCsrfToken(session.csrfToken);
      UserAccount.current = session.user;
      return true;
    }, false);
  }

  // 1.12 / 2.7 / 4.7 / 6.10 — Log Out. The session id lives in an HttpOnly cookie,
  // so the browser cannot read it; the server ends whichever session sent the request.
  static async EndSession(sessionId = null) {
    return this.attempt(async () => {
      const result = await api('/api/logout', { method: 'POST', body: { sessionId } });
      setCsrfToken('');
      UserAccount.current = null;
      return result.ok === true;
    }, false);
  }

  static async GetProfileOptions() {
    return this.attempt(async () => api('/api/profiles/options'), []);
  }

  static async Register(username, name, email, password, confirmPassword, profile) {
    return this.attempt(async () => {
      await api('/api/register', { method: 'POST', body: { username, name, email, password, confirmPassword, profile } });
      return true;
    }, false);
  }
}
