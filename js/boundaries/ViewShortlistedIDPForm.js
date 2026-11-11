// Boundary: ViewShortlistedIDPForm — Story 4.5 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewShortlistedIDPC } from '../controllers/ViewShortlistedIDPC.js';

export class ViewShortlistedIDPForm {
  constructor(view, control = new ViewShortlistedIDPC()) {
    this.view = view;
    this.control = control;
    this.customerId = null;
  }

  async OnView() {
    const records = await this.control.ViewShortlistedIDP(this.view.customerId());
    this.DisplayShortlist(records);
    return records;
  }

  // A1: an empty list is displayed with a suitable message by the view.
  DisplayShortlist(records) { this.view.list(records, this.control.error); }
}
