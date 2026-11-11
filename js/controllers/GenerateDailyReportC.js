// Control: GenerateDailyReportC — Story 6.6 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { Report } from '../entities/Report.js';
import { rules } from './rules.js';

export class GenerateDailyReportC {
  constructor(entity = Report) {
    this.entity = entity;
    this.error = '';
  }

  async GenerateDailyReport(date) {
    this.error = rules.period(date, date, 1);
    if (this.error) return null;
    const report = await this.entity.BuildDailyReport(date);
    if (!report) this.error = this.entity.lastError;
    return report;
  }
}
