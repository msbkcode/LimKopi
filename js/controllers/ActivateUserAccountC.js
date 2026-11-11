// Control: ActivateUserAccountC — Story Ext #12 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules } from './rules.js';

export class ActivateUserAccountC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async ActivateUserAccount(accountId) {
    this.error = rules.id(accountId);
    if (this.error) return false;
    const ok = await this.entity.ActivateUserAccount(accountId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
