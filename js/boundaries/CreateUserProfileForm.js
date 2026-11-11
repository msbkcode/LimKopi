// Boundary: CreateUserProfileForm — Story 1.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CreateUserProfileC } from '../controllers/CreateUserProfileC.js';

export class CreateUserProfileForm {
  constructor(view, control = new CreateUserProfileC()) {
    this.view = view;
    this.control = control;
    this.userProfile = null;
  }

  async OnCreate(role, description, permissions) {
    const ok = await this.control.CreateUserProfile(role, description, permissions);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('User profile created successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
