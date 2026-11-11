// Control: CreatePastIDPC — Story 3.6 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class CreatePastIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async CreatePastIDP(title, description, category, photos, completionDate) {
    this.error = rules.idp(title, description, category, photos, completionDate, { past: true });
    if (this.error) return false;
    const ok = await this.entity.CreateIDP(title.trim(), description.trim(), category, photos, completionDate, 'Past');
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
