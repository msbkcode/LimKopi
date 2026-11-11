// Control: RemoveFavouriteC — Story Ext #41 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { Favourite } from '../entities/Favourite.js';
import { rules } from './rules.js';

export class RemoveFavouriteC {
  constructor(entity = Favourite) {
    this.entity = entity;
    this.error = '';
  }

  async RemoveFavourite(customerId, idpId) {
    this.error = rules.id(idpId, 'IDP');
    if (this.error) return false;
    const ok = await this.entity.RemoveFavourite(customerId, idpId);
    if (!ok) this.error = this.entity.lastError;
    return ok;
  }
}
