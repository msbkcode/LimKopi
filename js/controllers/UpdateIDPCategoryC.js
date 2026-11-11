// Control: UpdateIDPCategoryC — Story 6.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDPCategory } from '../entities/IDPCategory.js';
import { rules } from './rules.js';

export class UpdateIDPCategoryC {
  constructor(entity = IDPCategory) {
    this.entity = entity;
    this.error = '';
  }

  async UpdateIDPCategory(categoryId, name, description) {
    this.error = rules.id(categoryId, 'IDP category') || rules.category(name, description);
    if (this.error) return false;
    const ok = await this.entity.UpdateIDPCategory(categoryId, name.trim(), description.trim());
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
