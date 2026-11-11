// Entity: Favourite — a Customer's shortlist entry (customerId, idpId, savedAt).
// customerId is accepted to match the BCE design, but the server always uses the
// customer of the authenticated session, so one customer can never edit another's list.
import { api, q } from '../api.js';
import { EntityBase } from './EntityBase.js';
import { IDP } from './IDP.js';

export class Favourite extends EntityBase {
  static async AddFavourite(customerId, idpId) {
    return this.attempt(async () => {
      await api(`/api/idps/${q(idpId)}/favourite`, { method: 'POST', body: { customerId } });
      return true;
    }, false);
  }

  static async RemoveFavourite(customerId, idpId) {
    return this.attempt(async () => {
      await api(`/api/idps/${q(idpId)}/unfavourite`, { method: 'POST', body: { customerId } });
      return true;
    }, false);
  }

  static async GetShortlistedIDPs(customerId) {
    return this.attempt(async () => (await api('/api/favourites')).map(IDP.from), []);
  }

  static async FindMatchingShortlistedIDPs(customerId, searchKeyword) {
    return this.attempt(async () => (await api(`/api/favourites?q=${q(searchKeyword)}`)).map(IDP.from), []);
  }
}
