// Boundary: ActivateIDPForm — Story Ext #56 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ActivateIDPC } from '../controllers/ActivateIDPC.js';

export class ActivateIDPForm {
  constructor(view, control = new ActivateIDPC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnActivate(idpId) {
    this.idpId = idpId;
    const confirmed = await this.view.confirm('Activate this IDP?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.ActivateIDP(idpId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The IDP has been activated.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
