// Control: ViewUserProfileC — Story 1.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserProfile } from '../entities/UserProfile.js';
import { rules } from './rules.js';

export class ViewUserProfileC {
  constructor(entity = UserProfile) {
    this.entity = entity;
    this.error = '';
  }

  async ViewUserProfile(profileId) {
    this.error = rules.id(profileId);
    if (this.error) return null;
    const record = await this.entity.GetUserProfile(profileId);
    if (!record) this.error = this.entity.lastError || 'Record not found.';
    return record;
  }

  // Step 2 of the normal flow — list the available records (View All).
  async ViewAllUserProfiles() {
    const records = await this.entity.GetAllUserProfiles();
    this.error = this.entity.lastError;
    return records;
  }
}
