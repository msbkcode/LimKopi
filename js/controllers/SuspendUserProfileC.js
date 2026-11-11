// Control: SuspendUserProfileC — Story 1.4 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserProfile } from '../entities/UserProfile.js';
import { rules } from './rules.js';

export class SuspendUserProfileC {
  constructor(entity = UserProfile) {
    this.entity = entity;
    this.error = '';
  }

  async SuspendUserProfile(profileId) {
    this.error = rules.id(profileId);
    if (this.error) return false;
    const ok = await this.entity.SuspendUserProfile(profileId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
