// Boundary: SuspendUserProfileForm — Story 1.4 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SuspendUserProfileC } from '../controllers/SuspendUserProfileC.js';

export class SuspendUserProfileForm {
  constructor(view, control = new SuspendUserProfileC()) {
    this.view = view;
    this.control = control;
    this.profileId = null;
  }

  async OnSuspend(profileId) {
    this.profileId = profileId;
    const confirmed = await this.view.confirm('Suspend this user profile?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.SuspendUserProfile(profileId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The user profile has been suspended.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
