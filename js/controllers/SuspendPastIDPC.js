// Control: SuspendPastIDPC — Story 3.9 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class SuspendPastIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async SuspendPastIDP(idpId) {
    this.error = rules.id(idpId);
    if (this.error) return false;
    const ok = await this.entity.SuspendIDP(idpId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
