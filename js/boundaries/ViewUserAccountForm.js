// Boundary: ViewUserAccountForm — Story 1.7 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewUserAccountC } from '../controllers/ViewUserAccountC.js';

export class ViewUserAccountForm {
  constructor(view, control = new ViewUserAccountC()) {
    this.view = view;
    this.control = control;
    this.accountId = null;
  }

  async OnView(accountId) {
    this.accountId = accountId;
    const record = await this.control.ViewUserAccount(accountId);
    if (record) this.DisplayAccount(record);
    else this.DisplayError();
    return record;
  }

  DisplayAccount(record) { this.view.show('User account', record); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // Normal flow step 2 — display the list of available records.
  async OnViewAll() {
    const records = await this.control.ViewAllUserAccounts();
    if (this.control.error) this.DisplayError();
    else this.DisplayRecords(records);
    return records;
  }

  DisplayRecords(records) { this.view.list(records); }
}
