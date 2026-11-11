// Control: SuspendUserAccountC — Story 1.9 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules } from './rules.js';

export class SuspendUserAccountC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async SuspendUserAccount(accountId) {
    this.error = rules.id(accountId);
    if (this.error) return false;
    const ok = await this.entity.SuspendUserAccount(accountId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
