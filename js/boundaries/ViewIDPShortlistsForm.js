// Boundary: ViewIDPShortlistsForm — Story 5.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewIDPShortlistsC } from '../controllers/ViewIDPShortlistsC.js';

export class ViewIDPShortlistsForm {
  constructor(view, control = new ViewIDPShortlistsC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnView(idpId) {
    this.idpId = idpId;
    const count = await this.control.GetShortlistCount(idpId);
    if (count >= 0) this.DisplayShortlistCount(count);
    else this.DisplayError();
    return count;
  }

  DisplayShortlistCount(count) { this.view.count(this.idpId, count); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
