// Control: ViewIDPViewsC — Story 5.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class ViewIDPViewsC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async GetViewCount(idpId) {
    this.error = rules.id(idpId, 'IDP');
    if (this.error) return -1;
    const count = await this.entity.GetViewCount(idpId);
    if (count < 0) this.error = this.entity.lastError || 'IDP not found.';
    return count;
  }
}
