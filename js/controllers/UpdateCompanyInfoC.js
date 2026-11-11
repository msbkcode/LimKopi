// Control: UpdateCompanyInfoC — Story 2.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CompanyInfo } from '../entities/CompanyInfo.js';
import { rules } from './rules.js';

export class UpdateCompanyInfoC {
  constructor(entity = CompanyInfo) {
    this.entity = entity;
    this.error = '';
  }

  async UpdateCompanyInfo(companyId, companyName, address, phone, email, description) {
    this.error = rules.id(companyId, 'company') || rules.company(companyName, '', address, phone, email, description, { creating: false });
    if (this.error) return false;
    const ok = await this.entity.UpdateCompanyInfo(companyId, companyName.trim(), address.trim(), phone.trim(), email.trim(), description.trim());
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
