// Boundary: SuspendPastIDPForm — Story 3.9 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SuspendPastIDPC } from '../controllers/SuspendPastIDPC.js';

export class SuspendPastIDPForm {
  constructor(view, control = new SuspendPastIDPC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnSuspend(idpId) {
    this.idpId = idpId;
    const confirmed = await this.view.confirm('Suspend this past IDP?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.SuspendPastIDP(idpId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The past IDP has been suspended.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
