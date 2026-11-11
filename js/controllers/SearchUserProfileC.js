// Control: SearchUserProfileC — Story 1.5 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserProfile } from '../entities/UserProfile.js';
import { rules } from './rules.js';

export class SearchUserProfileC {
  constructor(entity = UserProfile) {
    this.entity = entity;
    this.error = '';
  }

  async SearchUserProfile(searchKeyword) {
    this.error = rules.keyword(searchKeyword);
    if (this.error) return [];
    const results = await this.entity.FindMatchingUserProfiles(searchKeyword.trim());
    this.error = this.entity.lastError;
    return results;
  }
}
