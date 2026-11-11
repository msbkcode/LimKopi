// Boundary: CreateUserAccountForm — Story 1.6 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CreateUserAccountC } from '../controllers/CreateUserAccountC.js';

export class CreateUserAccountForm {
  constructor(view, control = new CreateUserAccountC()) {
    this.view = view;
    this.control = control;
    this.userAccount = null;
  }

  async OnCreate(username, password, email, profile) {
    const ok = await this.control.CreateUserAccount(username, password, email, profile);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('User account created successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
