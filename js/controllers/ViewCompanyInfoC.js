// Control: ViewCompanyInfoC — Story 2.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CompanyInfo } from '../entities/CompanyInfo.js';
import { rules } from './rules.js';

export class ViewCompanyInfoC {
  constructor(entity = CompanyInfo) {
    this.entity = entity;
    this.error = '';
  }

  async ViewCompanyInfo(companyId) {
    this.error = rules.id(companyId);
    if (this.error) return null;
    const record = await this.entity.GetCompanyInfo(companyId);
    if (!record) this.error = this.entity.lastError || 'Record not found.';
    return record;
  }

  // Step 2 of the normal flow — list the available records (View All).
  async ViewAllCompanyInfo() {
    const records = await this.entity.GetAllCompanyInfo();
    this.error = this.entity.lastError;
    return records;
  }
}
