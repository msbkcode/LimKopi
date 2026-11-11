// Boundary: LoginForm — Story 1.11, 2.6, 4.6, 6.9 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { LoginC } from '../controllers/LoginC.js';

export class LoginForm {
  constructor(view, control = new LoginC()) {
    this.view = view;
    this.control = control;
    this.username = null;
    this.password = null;
  }

  async OnLogin(username, password) {
    this.username = username;
    const ok = await this.control.Login(username, password);
    this.password = null;                                   // never keep the password in memory
    if (ok) this.DisplayHome();
    else this.DisplayError();
    return ok;
  }

  DisplayHome() { this.view.home(); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
