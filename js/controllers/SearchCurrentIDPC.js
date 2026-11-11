// Control: SearchCurrentIDPC — Story 3.5 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class SearchCurrentIDPC {
  constructor(entity = IDP) {
    this.entity = entity;
    this.error = '';
  }

  async SearchCurrentIDP(searchKeyword) {
    this.error = rules.keyword(searchKeyword);
    if (this.error) return [];
    const results = await this.entity.FindMatchingCurrentIDPs(searchKeyword.trim());
    this.error = this.entity.lastError;
    return results;
  }
}
