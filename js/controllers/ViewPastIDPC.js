// Control: ViewPastIDPC — Story 3.7 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class ViewPastIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async ViewPastIDP(idpId) {
    this.error = rules.id(idpId);
    if (this.error) return null;
    const record = await this.entity.GetIDP(idpId);
    if (!record) this.error = this.entity.lastError || 'Record not found.';
    return record;
  }

  // Step 2 of the normal flow — list the available records (View All).
  async ViewAllPastIDPs() {
    const records = await this.entity.GetPortfolio('Past');
    this.error = this.entity.lastError;
    return records;
  }
}
