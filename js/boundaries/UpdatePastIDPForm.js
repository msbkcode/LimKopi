// Boundary: UpdatePastIDPForm — Story 3.8 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UpdatePastIDPC } from '../controllers/UpdatePastIDPC.js';

export class UpdatePastIDPForm {
  constructor(view, control = new UpdatePastIDPC()) {
    this.view = view;
    this.control = control;
    this.idp = null;
  }

  async OnUpdate(idpId, title, description, category, photos, completionDate) {
    const ok = await this.control.UpdatePastIDP(idpId, title, description, category, photos, completionDate);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Past IDP updated successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // A3/A2: Update cancelled — the form closes and nothing is sent to the server.
  OnCancel() {
    this.view.cancel();
    return false;
  }
}
