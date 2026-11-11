// Entity: IDPCategory — name, description, status.
import { api, q } from '../api.js';
import { EntityBase } from './EntityBase.js';

export class IDPCategory extends EntityBase {
  constructor({ id, name, description, status = 'Active', createdAt, updatedAt } = {}) {
    super();
    Object.assign(this, { categoryId: id, id, name, description, status, createdAt, updatedAt });
  }

  static from(row) { return row ? new IDPCategory(row) : null; }

  static async CreateIDPCategory(name, description) {
    return this.attempt(async () => {
      await api('/api/records/categories', { method: 'POST', body: { name, description } });
      return true;
    }, false);
  }

  static async GetAllIDPCategories() {
    return this.attempt(async () => (await api('/api/records/categories')).map(IDPCategory.from), []);
  }

  static async GetIDPCategory(categoryId) {
    return this.attempt(async () => IDPCategory.from(await api(`/api/records/categories/${q(categoryId)}`)), null);
  }

  static async UpdateIDPCategory(categoryId, name, description) {
    return this.attempt(async () => {
      await api(`/api/records/categories/${q(categoryId)}`, { method: 'PUT', body: { name, description } });
      return true;
    }, false);
  }

  static async SuspendIDPCategory(categoryId) {
    return this.attempt(async () => {
      await api(`/api/records/categories/${q(categoryId)}/suspend`, { method: 'POST' });
      return true;
    }, false);
  }

  static async ActivateIDPCategory(categoryId) {
    return this.attempt(async () => {
      await api(`/api/records/categories/${q(categoryId)}/activate`, { method: 'POST' });
      return true;
    }, false);
  }

  // Picker data for Interior Designers' IDP forms (any signed-in user may read active categories).
  static async GetActiveIDPCategories() {
    return this.attempt(async () => (await api('/api/categories/active')).map(IDPCategory.from), []);
  }

  static async FindMatchingIDPCategories(searchKeyword) {
    return this.attempt(async () => (await api(`/api/records/categories?q=${q(searchKeyword)}`)).map(IDPCategory.from), []);
  }
}

