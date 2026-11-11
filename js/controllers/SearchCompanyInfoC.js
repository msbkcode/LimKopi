// Control: SearchCompanyInfoC — Story 2.5 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CompanyInfo } from '../entities/CompanyInfo.js';
import { rules } from './rules.js';

export class SearchCompanyInfoC {
  constructor(entity = CompanyInfo) {
    this.entity = entity;
    this.error = '';
  }

  async SearchCompanyInfo(searchKeyword) {
    this.error = rules.keyword(searchKeyword);
    if (this.error) return [];
    const results = await this.entity.FindMatchingCompanyInfo(searchKeyword.trim());
    this.error = this.entity.lastError;
    return results;
  }
}
