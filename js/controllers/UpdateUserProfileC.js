// Control: UpdateUserProfileC — Story 1.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserProfile } from '../entities/UserProfile.js';
import { rules } from './rules.js';

export class UpdateUserProfileC {
  constructor(entity = UserProfile) {
    this.entity = entity;
    this.error = '';
  }

  async UpdateUserProfile(profileId, role, description, permissions) {
    this.error = rules.id(profileId, 'user profile') || rules.profile(role, description, permissions);
    if (this.error) return false;
    const ok = await this.entity.UpdateUserProfile(profileId, role.trim(), description.trim(), permissions);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
