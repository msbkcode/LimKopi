// Control: ViewCurrentIDPC — Story 3.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class ViewCurrentIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async ViewCurrentIDP(idpId) {
    this.error = rules.id(idpId);
    if (this.error) return null;
    const record = await this.entity.GetIDP(idpId);
    if (!record) this.error = this.entity.lastError || 'Record not found.';
    return record;
  }

  // Step 2 of the normal flow — list the available records (View All).
  async ViewAllCurrentIDPs() {
    const records = await this.entity.GetPortfolio('Current');
    this.error = this.entity.lastError;
    return records;
  }
}
