// Boundary: ViewPastIDPForm — Story 3.7 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewPastIDPC } from '../controllers/ViewPastIDPC.js';

export class ViewPastIDPForm {
  constructor(view, control = new ViewPastIDPC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnView(idpId) {
    this.idpId = idpId;
    const record = await this.control.ViewPastIDP(idpId);
    if (record) this.DisplayIDP(record);
    else this.DisplayError();
    return record;
  }

  DisplayIDP(record) { this.view.show('Past IDP', record); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // Normal flow step 2 — display the list of available records.
  async OnViewAll() {
    const records = await this.control.ViewAllPastIDPs();
    if (this.control.error) this.DisplayError();
    else this.DisplayRecords(records);
    return records;
  }

  DisplayRecords(records) { this.view.list(records); }
}
