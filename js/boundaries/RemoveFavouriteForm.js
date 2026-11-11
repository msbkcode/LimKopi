// Boundary: RemoveFavouriteForm — Story Ext #41 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { RemoveFavouriteC } from '../controllers/RemoveFavouriteC.js';

export class RemoveFavouriteForm {
  constructor(view, control = new RemoveFavouriteC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnRemove(idpId) {
    this.idpId = idpId;
    const ok = await this.control.RemoveFavourite(this.view.customerId(), idpId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Removed from your favourites.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
