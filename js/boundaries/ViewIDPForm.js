// Boundary: ViewIDPForm — Story 4.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewIDPC } from '../controllers/ViewIDPC.js';

export class ViewIDPForm {
  constructor(view, control = new ViewIDPC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnView(idpId) {
    this.idpId = idpId;
    const idp = await this.control.ViewIDP(idpId);
    if (idp) this.DisplayIDP(idp);
    else this.DisplayError();
    return idp;
  }

  DisplayIDP(idp) { this.view.show('IDP', idp); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
