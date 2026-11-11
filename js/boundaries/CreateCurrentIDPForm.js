// Boundary: CreateCurrentIDPForm — Story 3.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CreateCurrentIDPC } from '../controllers/CreateCurrentIDPC.js';

export class CreateCurrentIDPForm {
  constructor(view, control = new CreateCurrentIDPC()) {
    this.view = view;
    this.control = control;
    this.idp = null;
  }

  async OnCreate(title, description, category, photos) {
    const ok = await this.control.CreateCurrentIDP(title, description, category, photos);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Current IDP created successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
