// Control: ViewIDPC — Story 4.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class ViewIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async ViewIDP(idpId) {
    this.error = rules.id(idpId, 'IDP');
    if (this.error) return null;
    const idp = await this.entity.GetIDP(idpId, { asCustomer: true });
    if (!idp) {
      this.error = this.entity.lastError || 'IDP not found.';
      return null;
    }
    const counted = await this.entity.IncrementViewCount(idpId);
    return counted ? this.entity.lastViewed : idp;
  }
}
