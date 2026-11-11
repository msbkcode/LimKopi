// Boundary: UpdateCurrentIDPForm — Story 3.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UpdateCurrentIDPC } from '../controllers/UpdateCurrentIDPC.js';

export class UpdateCurrentIDPForm {
  constructor(view, control = new UpdateCurrentIDPC()) {
    this.view = view;
    this.control = control;
    this.idp = null;
  }

  async OnUpdate(idpId, title, description, category, photos) {
    const ok = await this.control.UpdateCurrentIDP(idpId, title, description, category, photos);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Current IDP updated successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // A3/A2: Update cancelled — the form closes and nothing is sent to the server.
  OnCancel() {
    this.view.cancel();
    return false;
  }
}
