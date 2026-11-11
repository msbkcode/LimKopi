// Boundary: UpdateCompanyInfoForm — Story 2.3 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { UpdateCompanyInfoC } from '../controllers/UpdateCompanyInfoC.js';

export class UpdateCompanyInfoForm {
  constructor(view, control = new UpdateCompanyInfoC()) {
    this.view = view;
    this.control = control;
    this.companyInfo = null;
  }

  async OnUpdate(companyId, companyName, address, phone, email, description) {
    const ok = await this.control.UpdateCompanyInfo(companyId, companyName, address, phone, email, description);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Company information updated successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }

  // A3/A2: Update cancelled — the form closes and nothing is sent to the server.
  OnCancel() {
    this.view.cancel();
    return false;
  }
}
