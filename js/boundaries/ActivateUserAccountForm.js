// Boundary: ActivateUserAccountForm — Story Ext #12 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ActivateUserAccountC } from '../controllers/ActivateUserAccountC.js';

export class ActivateUserAccountForm {
  constructor(view, control = new ActivateUserAccountC()) {
    this.view = view;
    this.control = control;
    this.accountId = null;
  }

  async OnActivate(accountId) {
    this.accountId = accountId;
    const confirmed = await this.view.confirm('Activate this user account?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.ActivateUserAccount(accountId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The user account has been activated.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
