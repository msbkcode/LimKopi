// Boundary: ViewCurrentIDPForm — Story 3.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewCurrentIDPC } from '../controllers/ViewCurrentIDPC.js';

export class ViewCurrentIDPForm {
  constructor(view, control = new ViewCurrentIDPC()) {
    this.view = view;
    this.control = control;
    this.idpId = null;
  }

  async OnView(idpId) {
    this.idpId = idpId;
    const record = await this.control.ViewCurrentIDP(idpId);
    if (record) this.DisplayIDP(record);
    else this.DisplayError();
    return record;
  }

  DisplayIDP(record) { this.view.show('Current IDP', record); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // Normal flow step 2 — display the list of available records.
  async OnViewAll() {
    const records = await this.control.ViewAllCurrentIDPs();
    if (this.control.error) this.DisplayError();
    else this.DisplayRecords(records);
    return records;
  }

  DisplayRecords(records) { this.view.list(records); }
}
