// Entity: CompanyInfo — companyName, UEN, address, phone, email, description, status.
import { api, q } from '../api.js';
import { EntityBase } from './EntityBase.js';

export class CompanyInfo extends EntityBase {
  constructor({ id, ownerId, companyName, uen, address, phone, email, description, status = 'Active', createdAt, updatedAt } = {}) {
    super();
    Object.assign(this, { companyId: id, id, ownerId, companyName, uen, address, phone, email, description, status, createdAt, updatedAt });
  }

  static from(row) { return row ? new CompanyInfo(row) : null; }

  static async CreateCompanyInfo(companyName, uen, address, phone, email, description) {
    return this.attempt(async () => {
      await api('/api/records/companies', { method: 'POST', body: { companyName, uen, address, phone, email, description } });
      return true;
    }, false);
  }

  static async GetCompanyInfo(companyId) {
    return this.attempt(async () => CompanyInfo.from(await api(`/api/records/companies/${q(companyId)}`)), null);
  }

  static async GetAllCompanyInfo() {
    return this.attempt(async () => (await api('/api/records/companies')).map(CompanyInfo.from), []);
  }

  static async UpdateCompanyInfo(companyId, companyName, address, phone, email, description) {
    return this.attempt(async () => {
      await api(`/api/records/companies/${q(companyId)}`, { method: 'PUT', body: { companyName, address, phone, email, description } });
      return true;
    }, false);
  }

  static async SuspendCompanyInfo(companyId) {
    return this.attempt(async () => {
      await api(`/api/records/companies/${q(companyId)}/suspend`, { method: 'POST' });
      return true;
    }, false);
  }

  static async ActivateCompanyInfo(companyId) {
    return this.attempt(async () => {
      await api(`/api/records/companies/${q(companyId)}/activate`, { method: 'POST' });
      return true;
    }, false);
  }

  static async FindMatchingCompanyInfo(searchKeyword) {
    return this.attempt(async () => (await api(`/api/records/companies?q=${q(searchKeyword)}`)).map(CompanyInfo.from), []);
  }
}
