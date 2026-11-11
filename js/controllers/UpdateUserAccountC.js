// Control: UpdateUserAccountC — Story 1.8 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules, PATTERNS } from './rules.js';

export class UpdateUserAccountC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async UpdateUserAccount(accountId, email, password, profile, username = null) {
    this.error = rules.id(accountId, 'user account') || rules.account('', password, email, profile, { creating: false });
    if (this.error) return false;
    if (username !== null && !PATTERNS.username.test(String(username).trim())) {
      this.error = 'Username must be 3–30 letters, digits, dots, dashes or underscores.';
      return false;
    }
    const ok = await this.entity.UpdateUserAccount(accountId, email.trim(), password, profile, '', username === null ? null : username.trim());
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
