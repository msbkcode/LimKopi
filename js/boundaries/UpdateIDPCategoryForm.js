// Boundary: UpdateIDPCategoryForm — Story 6.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UpdateIDPCategoryC } from '../controllers/UpdateIDPCategoryC.js';

export class UpdateIDPCategoryForm {
  constructor(view, control = new UpdateIDPCategoryC()) {
    this.view = view;
    this.control = control;
    this.idpCategory = null;
  }

  async OnUpdate(categoryId, name, description) {
    const ok = await this.control.UpdateIDPCategory(categoryId, name, description);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('IDP category updated successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // A3/A2: Update cancelled — the form closes and nothing is sent to the server.
  OnCancel() {
    this.view.cancel();
    return false;
  }
}
