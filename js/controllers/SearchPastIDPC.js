// Control: SearchPastIDPC — Story 3.10 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class SearchPastIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async SearchPastIDP(searchKeyword) {
    this.error = rules.keyword(searchKeyword);
    if (this.error) return [];
    const results = await this.entity.FindMatchingPastIDPs(searchKeyword.trim());
    this.error = this.entity.lastError;
    return results;
  }
}
