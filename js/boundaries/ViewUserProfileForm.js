// Boundary: ViewUserProfileForm — Story 1.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewUserProfileC } from '../controllers/ViewUserProfileC.js';

export class ViewUserProfileForm {
  constructor(view, control = new ViewUserProfileC()) {
    this.view = view;
    this.control = control;
    this.profileId = null;
  }

  async OnView(profileId) {
    this.profileId = profileId;
    const record = await this.control.ViewUserProfile(profileId);
    if (record) this.DisplayProfile(record);
    else this.DisplayError();
    return record;
  }

  DisplayProfile(record) { this.view.show('User profile', record); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // Normal flow step 2 — display the list of available records.
  async OnViewAll() {
    const records = await this.control.ViewAllUserProfiles();
    if (this.control.error) this.DisplayError();
    else this.DisplayRecords(records);
    return records;
  }

  DisplayRecords(records) { this.view.list(records); }
}
