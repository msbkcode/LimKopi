// Boundary: GenerateDailyReportForm — Story 6.6 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { GenerateDailyReportC } from '../controllers/GenerateDailyReportC.js';

export class GenerateDailyReportForm {
  constructor(view, control = new GenerateDailyReportC()) {
    this.view = view;
    this.control = control;
    this.reportDate = null;
  }

  async OnGenerate(date) {
    const report = await this.control.GenerateDailyReport(date);
    if (!report) this.DisplayError();                      // A2: invalid period
    else if (report.noData) this.DisplayNoData(report);    // A1: no data for the period
    else this.DisplayReport(report);
    return report;
  }

  DisplayReport(report) { this.view.report(report); }

  DisplayNoData(report) { this.view.noData(report); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
