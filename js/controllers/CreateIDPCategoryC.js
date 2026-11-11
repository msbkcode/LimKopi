// Control: CreateIDPCategoryC — Story 6.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDPCategory } from '../entities/IDPCategory.js';
import { rules } from './rules.js';

export class CreateIDPCategoryC {
  constructor(entity = IDPCategory) {
    this.entity = entity;
    this.error = '';
  }

  async CreateIDPCategory(name, description) {
    this.error = rules.category(name, description);
    if (this.error) return false;
    const ok = await this.entity.CreateIDPCategory(name.trim(), description.trim());
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
