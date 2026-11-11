// Control: LoginC — Story 1.11, 2.6, 4.6, 6.9 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules } from './rules.js';

export class LoginC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async Login(username, password) {
    this.error = rules.login(username, password);
    if (this.error) return false;
    const ok = await this.entity.Authenticate(String(username).trim(), password);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
