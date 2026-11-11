// Boundary: ViewIDPCategoryForm — Story 6.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewIDPCategoryC } from '../controllers/ViewIDPCategoryC.js';

export class ViewIDPCategoryForm {
  constructor(view, control = new ViewIDPCategoryC()) {
    this.view = view;
    this.control = control;
    this.categoryId = null;
  }

  async OnView() {
    const records = await this.control.ViewIDPCategories();
    this.DisplayCategories(records);
    return records;
  }

  // A1: an empty list is displayed with a suitable message by the view.
  DisplayCategories(records) { this.view.list(records, this.control.error); }
}
