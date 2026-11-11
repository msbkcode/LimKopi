// Control: GenerateMonthlyReportC — Story 6.8 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { Report } from '../entities/Report.js';
import { rules } from './rules.js';

export class GenerateMonthlyReportC {
  constructor(entity = Report) {
    this.entity = entity;
    this.error = '';
  }

  async GenerateMonthlyReport(startDate, endDate) {
    this.error = rules.period(startDate, endDate, 31, { sameMonth: true });
    if (this.error) return null;
    const report = await this.entity.BuildMonthlyReport(startDate, endDate);
    if (!report) this.error = this.entity.lastError;
    return report;
  }
}
