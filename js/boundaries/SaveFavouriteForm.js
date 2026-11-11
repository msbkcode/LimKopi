// Boundary: SaveFavouriteForm — Story 4.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SaveFavouriteC } from '../controllers/SaveFavouriteC.js';

export class SaveFavouriteForm {
  constructor(view, control = new SaveFavouriteC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnSave(idpId) {
    this.idpId = idpId;
    const ok = await this.control.SaveFavourite(this.view.customerId(), idpId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Added to your favourites.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
