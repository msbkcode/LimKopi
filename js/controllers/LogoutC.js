// Control: LogoutC — Story 1.12, 2.7, 4.7, 6.10 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';

export class LogoutC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  // Returns true when a live session was ended; false if it had already expired (A1).
  async Logout(sessionId) {
    const ok = await this.entity.EndSession(sessionId);
    this.error = this.entity.lastError;
    return ok;
  }
}
