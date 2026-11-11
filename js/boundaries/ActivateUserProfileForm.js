// Boundary: ActivateUserProfileForm — Story Ext #6 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ActivateUserProfileC } from '../controllers/ActivateUserProfileC.js';

export class ActivateUserProfileForm {
  constructor(view, control = new ActivateUserProfileC()) {
    this.view = view;
    this.control = control;
    this.profileId = null;
  }

  async OnActivate(profileId) {
    this.profileId = profileId;
    const confirmed = await this.view.confirm('Activate this user profile?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.ActivateUserProfile(profileId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The user profile has been activated.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
