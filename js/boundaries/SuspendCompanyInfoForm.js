// Boundary: SuspendCompanyInfoForm — Story 2.4 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SuspendCompanyInfoC } from '../controllers/SuspendCompanyInfoC.js';

export class SuspendCompanyInfoForm {
  constructor(view, control = new SuspendCompanyInfoC()) {
    this.view = view;
    this.control = control;
    this.companyId = null;
  }

  async OnSuspend(companyId) {
    this.companyId = companyId;
    const confirmed = await this.view.confirm('Suspend this company information?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.SuspendCompanyInfo(companyId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The company information has been suspended.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
