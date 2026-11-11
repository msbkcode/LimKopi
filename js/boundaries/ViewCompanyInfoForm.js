// Boundary: ViewCompanyInfoForm — Story 2.2 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ViewCompanyInfoC } from '../controllers/ViewCompanyInfoC.js';

export class ViewCompanyInfoForm {
  constructor(view, control = new ViewCompanyInfoC()) {
    this.view = view;
    this.control = control;
    this.companyId = null;
  }

  async OnView(companyId) {
    this.companyId = companyId;
    const record = await this.control.ViewCompanyInfo(companyId);
    if (record) this.DisplayCompanyInfo(record);
    else this.DisplayError();
    return record;
  }

  DisplayCompanyInfo(record) { this.view.show('Company information', record); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // Normal flow step 2 — display the list of available records.
  async OnViewAll() {
    const records = await this.control.ViewAllCompanyInfo();
    if (this.control.error) this.DisplayError();
    else this.DisplayRecords(records);
    return records;
  }

  DisplayRecords(records) { this.view.list(records); }
}
