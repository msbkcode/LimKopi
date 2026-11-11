// Control: ViewUserAccountC — Story 1.7 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules } from './rules.js';

export class ViewUserAccountC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async ViewUserAccount(accountId) {
    this.error = rules.id(accountId);
    if (this.error) return null;
    const record = await this.entity.GetUserAccount(accountId);
    if (!record) this.error = this.entity.lastError || 'Record not found.';
    return record;
  }

  // Step 2 of the normal flow — list the available records (View All).
  async ViewAllUserAccounts() {
    const records = await this.entity.GetAllUserAccounts();
    this.error = this.entity.lastError;
    return records;
  }
}
