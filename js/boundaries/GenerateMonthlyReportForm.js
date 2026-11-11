// Boundary: GenerateMonthlyReportForm — Story 6.8 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { GenerateMonthlyReportC } from '../controllers/GenerateMonthlyReportC.js';

export class GenerateMonthlyReportForm {
  constructor(view, control = new GenerateMonthlyReportC()) {
    this.view = view;
    this.control = control;
    this.startDate = null;
    this.endDate = null;
  }

  async OnGenerate(startDate, endDate) {
    const report = await this.control.GenerateMonthlyReport(startDate, endDate);
    if (!report) this.DisplayError();                      // A2: invalid period
    else if (report.noData) this.DisplayNoData(report);    // A1: no data for the period
    else this.DisplayReport(report);
    return report;
  }

  DisplayReport(report) { this.view.report(report); }

  DisplayNoData(report) { this.view.noData(report); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
