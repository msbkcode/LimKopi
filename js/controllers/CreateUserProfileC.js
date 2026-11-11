// Control: CreateUserProfileC — Story 1.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UserProfile } from '../entities/UserProfile.js';
import { rules } from './rules.js';

export class CreateUserProfileC {
  constructor(entity = UserProfile) {
    this.entity = entity;
    this.error = '';
  }

  async CreateUserProfile(role, description, permissions) {
    this.error = rules.profile(role, description, permissions);
    if (this.error) return false;
    const ok = await this.entity.CreateUserProfile(role.trim(), description.trim(), permissions);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
