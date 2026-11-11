// Control: ActivateCompanyInfoC — Story Ext #55 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CompanyInfo } from '../entities/CompanyInfo.js';
import { rules } from './rules.js';

export class ActivateCompanyInfoC {
  constructor(entity = CompanyInfo) {
    this.entity = entity;
    this.error = '';
  }

  async ActivateCompanyInfo(companyId) {
    this.error = rules.id(companyId);
    if (this.error) return false;
    const ok = await this.entity.ActivateCompanyInfo(companyId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
