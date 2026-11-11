// Boundary: ViewIDPViewsForm — Story 5.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewIDPViewsC } from '../controllers/ViewIDPViewsC.js';

export class ViewIDPViewsForm {
  constructor(view, control = new ViewIDPViewsC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnView(idpId) {
    this.idpId = idpId;
    const count = await this.control.GetViewCount(idpId);
    if (count >= 0) this.DisplayViewCount(count);
    else this.DisplayError();
    return count;
  }

  DisplayViewCount(count) { this.view.count(this.idpId, count); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
