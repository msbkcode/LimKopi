// Control: GenerateWeeklyReportC — Story 6.7 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { Report } from '../entities/Report.js';
import { rules } from './rules.js';

export class GenerateWeeklyReportC {
  constructor(entity = Report) {
    this.entity = entity;
    this.error = '';
  }

  async GenerateWeeklyReport(startDate, endDate) {
    this.error = rules.period(startDate, endDate, 7);
    if (this.error) return null;
    const report = await this.entity.BuildWeeklyReport(startDate, endDate);
    if (!report) this.error = this.entity.lastError;
    return report;
  }
}
