// Control: ActivateIDPCategoryC — Story Ext #20 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDPCategory } from '../entities/IDPCategory.js';
import { rules } from './rules.js';

export class ActivateIDPCategoryC {
  constructor(entity = IDPCategory) {
    this.entity = entity;
    this.error = '';
  }

  async ActivateIDPCategory(categoryId) {
    this.error = rules.id(categoryId);
    if (this.error) return false;
    const ok = await this.entity.ActivateIDPCategory(categoryId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
