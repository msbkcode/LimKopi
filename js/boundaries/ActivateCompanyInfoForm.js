// Boundary: ActivateCompanyInfoForm — Story Ext #55 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { ActivateCompanyInfoC } from '../controllers/ActivateCompanyInfoC.js';

export class ActivateCompanyInfoForm {
  constructor(view, control = new ActivateCompanyInfoC()) {
    this.view = view;
    this.control = control;
    this.companyId = null;
  }

  async OnActivate(companyId) {
    this.companyId = companyId;
    const confirmed = await this.view.confirm('Activate this company information?');
    if (!confirmed) return false;                       // A3: cancelled — no change is made
    const ok = await this.control.ActivateCompanyInfo(companyId);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('The company information has been activated.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
