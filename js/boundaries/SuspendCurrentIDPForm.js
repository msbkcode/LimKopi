// Boundary: SuspendCurrentIDPForm — Story 3.4 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SuspendCurrentIDPC } from '../controllers/SuspendCurrentIDPC.js';

export class SuspendCurrentIDPForm {
  constructor(view, control = new SuspendCurrentIDPC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnSuspend(idpId) {
    this.idpId = idpId;
    const confirmed = await this.view.confirm('Suspend this current IDP?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.SuspendCurrentIDP(idpId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The current IDP has been suspended.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
