// Boundary: UpdateUserAccountForm — Story 1.8 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UpdateUserAccountC } from '../controllers/UpdateUserAccountC.js';

export class UpdateUserAccountForm {
  constructor(view, control = new UpdateUserAccountC()) {
    this.view = view;
    this.control = control;
    this.userAccount = null;
  }

  async OnUpdate(accountId, email, password, profile, username = null) {
    const ok = await this.control.UpdateUserAccount(accountId, email, password, profile, username);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('User account updated successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // A3/A2: Update cancelled — the form closes and nothing is sent to the server.
  OnCancel() {
    this.view.cancel();
    return false;
  }
}
