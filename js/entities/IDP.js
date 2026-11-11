// Entity: IDP — Interior Design Project.
// Current IDP: title, description, category, photos, status.
// Past IDP:    title, description, category, photos, completionDate, status.
// viewCount / shortlistCount are maintained by the server inside the same SQLite
// transaction as the customer's action, so the counters can never drift.
import { api, q } from '../api.js';
import { EntityBase } from './EntityBase.js';

export class IDP extends EntityBase {
  constructor(row = {}) {
    super();
    Object.assign(this, row, { idpId: row.id, category: row.categoryId });
  }

  static from(row) { return row ? new IDP(row) : null; }

  // CreateIDP(title, description, category, photos, status)                  — Current IDP (3.1)
  // CreateIDP(title, description, category, photos, completionDate, status)  — Past IDP (3.6)
  static async CreateIDP(title, description, category, photos, ...rest) {
    const [completionDate, stage] = rest.length >= 2 ? rest : [null, rest[0] ?? 'Current'];
    return this.attempt(async () => {
      await api('/api/records/idps', {
        method: 'POST',
        body: { title, description, categoryId: category, photos, completionDate, stage, ...IDP.extras },
      });
      return true;
    }, false);
  }

  // Optional attributes (style, location, budget, floorArea) set by the form before a call.
  static extras = {};

  static async GetIDP(idpId, { asCustomer = false } = {}) {
    const path = asCustomer ? `/api/idps/${q(idpId)}` : `/api/records/idps/${q(idpId)}`;
    return this.attempt(async () => IDP.from(await api(path)), null);
  }

  static async GetPortfolio(stage) {
    return this.attempt(async () => (await api(`/api/records/idps?stage=${q(stage)}`)).map(IDP.from), []);
  }

  // UpdateIDP(idpId, title, description, category, photos[, completionDate])
  static async UpdateIDP(idpId, title, description, category, photos, completionDate = null) {
    return this.attempt(async () => {
      await api(`/api/records/idps/${q(idpId)}`, {
        method: 'PUT', body: { title, description, categoryId: category, photos, completionDate, ...IDP.extras },
      });
      return true;
    }, false);
  }

  static async SuspendIDP(idpId) {
    return this.attempt(async () => {
      await api(`/api/records/idps/${q(idpId)}/suspend`, { method: 'POST' });
      return true;
    }, false);
  }

  static async ActivateIDP(idpId) {
    return this.attempt(async () => {
      await api(`/api/records/idps/${q(idpId)}/activate`, { method: 'POST' });
      return true;
    }, false);
  }

  static async FindMatchingCurrentIDPs(searchKeyword) {
    return this.attempt(async () => (await api(`/api/records/idps?stage=Current&q=${q(searchKeyword)}`)).map(IDP.from), []);
  }

  static async FindMatchingPastIDPs(searchKeyword) {
    return this.attempt(async () => (await api(`/api/records/idps?stage=Past&q=${q(searchKeyword)}`)).map(IDP.from), []);
  }

  // Customer gallery — every publicly visible IDP (active IDP, designer, company and category).
  static async GetPublicIDPs() {
    return this.attempt(async () => (await api('/api/idps')).map(IDP.from), []);
  }

  // 4.1 Customer — all publicly visible (active) IDPs.
  static async FindMatchingIDPs(searchKeyword) {
    return this.attempt(async () => (await api(`/api/idps/search?q=${q(searchKeyword)}`)).map(IDP.from), []);
  }

  // 4.2 — ViewIDPC calls this after GetIDP(); the server records a view event and returns the new count.
  static async IncrementViewCount(idpId) {
    return this.attempt(async () => {
      const updated = await api(`/api/idps/${q(idpId)}/view`, { method: 'POST' });
      IDP.lastViewed = IDP.from(updated);
      return true;
    }, false);
  }

  // 4.3 — the increment itself happens server-side in the AddFavourite transaction;
  // this method re-reads the IDP so the Boundary shows the updated count.
  static async IncrementShortlistCount(idpId) {
    return this.attempt(async () => {
      IDP.lastViewed = IDP.from(await api(`/api/idps/${q(idpId)}`));
      return true;
    }, false);
  }

  static async GetViewCount(idpId) {
    return this.attempt(async () => (await api(`/api/idps/${q(idpId)}/view-count`)).viewCount, -1);
  }

  static async GetShortlistCount(idpId) {
    return this.attempt(async () => (await api(`/api/idps/${q(idpId)}/shortlist-count`)).shortlistCount, -1);
  }
}
