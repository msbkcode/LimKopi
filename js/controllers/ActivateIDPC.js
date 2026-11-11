// Control: ActivateIDPC — Story Ext #56 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class ActivateIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async ActivateIDP(idpId) {
    this.error = rules.id(idpId);
    if (this.error) return false;
    const ok = await this.entity.ActivateIDP(idpId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
