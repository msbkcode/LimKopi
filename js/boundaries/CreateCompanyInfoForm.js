// Boundary: CreateCompanyInfoForm — Story 2.1 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { CreateCompanyInfoC } from '../controllers/CreateCompanyInfoC.js';

export class CreateCompanyInfoForm {
  constructor(view, control = new CreateCompanyInfoC()) {
    this.view = view;
    this.control = control;
    this.companyInfo = null;
  }

  async OnCreate(companyName, uen, address, phone, email, description) {
    const ok = await this.control.CreateCompanyInfo(companyName, uen, address, phone, email, description);
    if (ok) this.DisplaySuccess();
    else this.DisplayError();
    return ok;
  }

  DisplaySuccess() { this.view.success('Company information created successfully.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
