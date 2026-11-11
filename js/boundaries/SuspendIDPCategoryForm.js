// Boundary: SuspendIDPCategoryForm — Story 6.4 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SuspendIDPCategoryC } from '../controllers/SuspendIDPCategoryC.js';

export class SuspendIDPCategoryForm {
  constructor(view, control = new SuspendIDPCategoryC()) {
    this.view = view;
    this.control = control;
    this.categoryId = null;
  }

  async OnSuspend(categoryId) {
    this.categoryId = categoryId;
    const confirmed = await this.view.confirm('Suspend this IDP category?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.SuspendIDPCategory(categoryId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The IDP category has been suspended.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
