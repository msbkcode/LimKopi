// Control: SaveFavouriteC — Story 4.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { Favourite } from '../entities/Favourite.js';
import { IDP } from '../entities/IDP.js';
import { rules } from './rules.js';

export class SaveFavouriteC {
  constructor(favourite = Favourite, idp = IDP) {
    this.favourite = favourite;
    this.idp = idp;
    this.error = '';
  }

  async SaveFavourite(customerId, idpId) {
    this.error = rules.id(idpId, 'IDP');
    if (this.error) return false;
    const added = await this.favourite.AddFavourite(customerId, idpId);
    if (!added) {
      this.error = this.favourite.lastError;     // A1: already in favourites — count unchanged
      return false;
    }
    await this.idp.IncrementShortlistCount(idpId);
    return true;
  }
}
