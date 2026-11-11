// Control: CreateCompanyInfoC — Story 2.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CompanyInfo } from '../entities/CompanyInfo.js';
import { rules } from './rules.js';

export class CreateCompanyInfoC {
  constructor(entity = CompanyInfo) {
    this.entity = entity;
    this.error = '';
  }

  async CreateCompanyInfo(companyName, uen, address, phone, email, description) {
    this.error = rules.company(companyName, uen, address, phone, email, description);
    if (this.error) return false;
    const ok = await this.entity.CreateCompanyInfo(companyName.trim(), uen.trim().toUpperCase(), address.trim(), phone.trim(), email.trim(), description.trim());
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
