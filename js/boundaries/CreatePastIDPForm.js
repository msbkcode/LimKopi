// Boundary: CreatePastIDPForm — Story 3.6 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CreatePastIDPC } from '../controllers/CreatePastIDPC.js';

export class CreatePastIDPForm {
  constructor(view, control = new CreatePastIDPC()) {
    this.view = view;
    this.control = control;
    this.idp = null;
  }

  async OnCreate(title, description, category, photos, completionDate) {
    const ok = await this.control.CreatePastIDP(title, description, category, photos, completionDate);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Past IDP created successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
