// Boundary: SuspendUserAccountForm — Story 1.9 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SuspendUserAccountC } from '../controllers/SuspendUserAccountC.js';

export class SuspendUserAccountForm {
  constructor(view, control = new SuspendUserAccountC()) {
    this.view = view;
    this.control = control;
    this.accountId = null;
  }

  async OnSuspend(accountId) {
    this.accountId = accountId;
    const confirmed = await this.view.confirm('Suspend this user account?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.SuspendUserAccount(accountId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The user account has been suspended.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
