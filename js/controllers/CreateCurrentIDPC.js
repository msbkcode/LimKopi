// Control: CreateCurrentIDPC — Story 3.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class CreateCurrentIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async CreateCurrentIDP(title, description, category, photos) {
    this.error = rules.idp(title, description, category, photos, null);
    if (this.error) return false;
    const ok = await this.entity.CreateIDP(title.trim(), description.trim(), category, photos, 'Current');
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
