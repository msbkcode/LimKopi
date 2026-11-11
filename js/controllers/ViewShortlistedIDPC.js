// Control: ViewShortlistedIDPC — Story 4.5 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { Favourite } from '../entities/Favourite.js';

export class ViewShortlistedIDPC {
  constructor(entity = Favourite) {
    this.entity = entity;
    this.error = '';
  }

  async ViewShortlistedIDP(customerId) {
    const records = await this.entity.GetShortlistedIDPs(customerId);
    this.error = this.entity.lastError;
    return records;
  }
}
