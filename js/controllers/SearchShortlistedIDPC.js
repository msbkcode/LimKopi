// Control: SearchShortlistedIDPC — Story 4.4 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { Favourite } from '../entities/Favourite.js';
import { rules } from './rules.js';

export class SearchShortlistedIDPC {
  constructor(entity = Favourite) {
    this.entity = entity;
    this.error = '';
  }

  async SearchShortlistedIDP(customerId, searchKeyword) {
    this.error = rules.keyword(searchKeyword);
    if (this.error) return [];
    const results = await this.entity.FindMatchingShortlistedIDPs(customerId, searchKeyword.trim());
    this.error = this.entity.lastError;
    return results;
  }
}
