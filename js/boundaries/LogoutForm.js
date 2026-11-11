// Boundary: LogoutForm — Story 1.12, 2.7, 4.7, 6.10 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { LogoutC } from '../controllers/LogoutC.js';

export class LogoutForm {
  constructor(view, control = new LogoutC()) {
    this.view = view;
    this.control = control;
    this.sessionId = null;
  }

  async OnLogout() {
    const ended = await this.control.Logout(this.sessionId);
    this.DisplayLogin();                                    // A1: already ended -> still show login
    return ended;
  }

  DisplayLogin() { this.view.login(); }
}
