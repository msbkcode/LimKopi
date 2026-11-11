// Entity: UserProfile — a role template (role, description, permissions, status).
import { api, q } from '../api.js';
import { EntityBase } from './EntityBase.js';

export const PERMISSIONS = [
  'MANAGE_ACCOUNTS', 'MANAGE_PROFILES', 'MANAGE_COMPANY', 'MANAGE_IDP',
  'BROWSE_IDP', 'MANAGE_FAVOURITES', 'MANAGE_CATEGORIES', 'GENERATE_REPORTS',
];

export class UserProfile extends EntityBase {
  constructor({ id, role, description, permissions = [], status = 'Active', createdAt, updatedAt } = {}) {
    super();
    Object.assign(this, { profileId: id, id, role, description, permissions, status, createdAt, updatedAt });
  }

  static from(row) { return row ? new UserProfile(row) : null; }

  static async CreateUserProfile(role, description, permissions) {
    return this.attempt(async () => {
      await api('/api/records/profiles', { method: 'POST', body: { role, description, permissions } });
      return true;
    }, false);
  }

  static async GetUserProfile(profileId) {
    return this.attempt(async () => UserProfile.from(await api(`/api/records/profiles/${q(profileId)}`)), null);
  }

  static async GetAllUserProfiles() {
    return this.attempt(async () => (await api('/api/records/profiles')).map(UserProfile.from), []);
  }

  static async UpdateUserProfile(profileId, role, description, permissions) {
    return this.attempt(async () => {
      await api(`/api/records/profiles/${q(profileId)}`, { method: 'PUT', body: { role, description, permissions } });
      return true;
    }, false);
  }

  static async SuspendUserProfile(profileId) {
    return this.attempt(async () => {
      await api(`/api/records/profiles/${q(profileId)}/suspend`, { method: 'POST' });
      return true;
    }, false);
  }

  static async ActivateUserProfile(profileId) {
    return this.attempt(async () => {
      await api(`/api/records/profiles/${q(profileId)}/activate`, { method: 'POST' });
      return true;
    }, false);
  }

  static async FindMatchingUserProfiles(searchKeyword) {
    return this.attempt(async () => (await api(`/api/records/profiles?q=${q(searchKeyword)}`)).map(UserProfile.from), []);
  }
}
