// Control: ViewIDPCategoryC — Story 6.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { IDPCategory } from '../entities/IDPCategory.js';

export class ViewIDPCategoryC {
  constructor(entity = IDPCategory) {
    this.entity = entity;
    this.error = '';
  }

  async ViewIDPCategories() {
    const records = await this.entity.GetAllIDPCategories();
    this.error = this.entity.lastError;
    return records;
  }
}
