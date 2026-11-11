// Control: SearchUserAccountC — Story 1.10 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserAccount } from '../entities/UserAccount.js';
import { rules } from './rules.js';

export class SearchUserAccountC {
  constructor(entity = UserAccount) {
    this.entity = entity;
    this.error = '';
  }

  async SearchUserAccount(searchKeyword) {
    this.error = rules.keyword(searchKeyword);
    if (this.error) return [];
    const results = await this.entity.FindMatchingUserAccounts(searchKeyword.trim());
    this.error = this.entity.lastError;
    return results;
  }
}
