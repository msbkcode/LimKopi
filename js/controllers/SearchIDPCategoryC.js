// Control: SearchIDPCategoryC — Story 6.5 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDPCategory } from '../entities/IDPCategory.js';
import { rules } from './rules.js';

export class SearchIDPCategoryC {
  constructor(entity = IDPCategory) {
    this.entity = entity;
    this.error = '';
  }

  async SearchIDPCategory(searchKeyword) {
    this.error = rules.keyword(searchKeyword);
    if (this.error) return [];
    const results = await this.entity.FindMatchingIDPCategories(searchKeyword.trim());
    this.error = this.entity.lastError;
    return results;
  }
}
