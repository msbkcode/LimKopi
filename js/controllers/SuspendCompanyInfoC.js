// Control: SuspendCompanyInfoC — Story 2.4 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CompanyInfo } from '../entities/CompanyInfo.js';
import { rules } from './rules.js';

export class SuspendCompanyInfoC {
  constructor(entity = CompanyInfo) {
    this.entity = entity;
    this.error = '';
  }

  async SuspendCompanyInfo(companyId) {
    this.error = rules.id(companyId);
    if (this.error) return false;
    const ok = await this.entity.SuspendCompanyInfo(companyId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
