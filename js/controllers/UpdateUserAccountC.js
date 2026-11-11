// Control: UpdateUserAccountC — Story 1.8 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules } from './rules.js';

export class UpdateUserAccountC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async UpdateUserAccount(accountId, email, password, profile) {
    this.error = rules.id(accountId, 'user account') || rules.account('', password, email, profile, { creating: false });
    if (this.error) return false;
    const ok = await this.entity.UpdateUserAccount(accountId, email.trim(), password, profile);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
