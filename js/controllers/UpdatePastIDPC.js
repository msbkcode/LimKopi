// Control: UpdatePastIDPC — Story 3.8 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class UpdatePastIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async UpdatePastIDP(idpId, title, description, category, photos, completionDate) {
    this.error = rules.id(idpId, 'IDP') || rules.idp(title, description, category, photos, completionDate, { past: true });
    if (this.error) return false;
    const ok = await this.entity.UpdateIDP(idpId, title.trim(), description.trim(), category, photos, completionDate);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
