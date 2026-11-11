// Boundary: UpdateUserProfileForm — Story 1.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UpdateUserProfileC } from '../controllers/UpdateUserProfileC.js';

export class UpdateUserProfileForm {
  constructor(view, control = new UpdateUserProfileC()) {
    this.view = view;
    this.control = control;
    this.userProfile = null;
  }

  async OnUpdate(profileId, role, description, permissions) {
    const ok = await this.control.UpdateUserProfile(profileId, role, description, permissions);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('User profile updated successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // A3/A2: Update cancelled — the form closes and nothing is sent to the server.
  OnCancel() {
    this.view.cancel();
    return false;
  }
}
