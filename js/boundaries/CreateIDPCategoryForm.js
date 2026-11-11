// Boundary: CreateIDPCategoryForm — Story 6.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CreateIDPCategoryC } from '../controllers/CreateIDPCategoryC.js';

export class CreateIDPCategoryForm {
  constructor(view, control = new CreateIDPCategoryC()) {
    this.view = view;
    this.control = control;
    this.idpCategory = null;
  }

  async OnCreate(name, description) {
    const ok = await this.control.CreateIDPCategory(name, description);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('IDP category created successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
