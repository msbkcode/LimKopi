// Control: UpdateCurrentIDPC — Story 3.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class UpdateCurrentIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async UpdateCurrentIDP(idpId, title, description, category, photos) {
    this.error = rules.id(idpId, 'IDP') || rules.idp(title, description, category, photos, null);
    if (this.error) return false;
    const ok = await this.entity.UpdateIDP(idpId, title.trim(), description.trim(), category, photos);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
