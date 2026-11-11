// Control: CreateUserAccountC — Story 1.6 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules } from './rules.js';

export class CreateUserAccountC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async CreateUserAccount(username, password, email, profile) {
    this.error = rules.account(username, password, email, profile);
    if (this.error) return false;
    const ok = await this.entity.CreateUserAccount(username.trim(), password, email.trim(), profile);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
