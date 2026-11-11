// Entity: Report — platform activity for a period (Daily: one date; Weekly/Monthly: start–end dates).
import { api } from '../api.js';
import { EntityBase } from './EntityBase.js';

export class Report extends EntityBase {
  constructor(row = {}, noData = false) {
    super();
    Object.assign(this, row, { noData });
  }

  static async build(body) {
    return this.attempt(async () => {
      const result = await api('/api/reports', { method: 'POST', body });
      return new Report(result.report, result.noData);
    }, null);
  }

  static async BuildDailyReport(date) { return this.build({ reportType: 'Daily', date }); }

  static async BuildWeeklyReport(startDate, endDate) { return this.build({ reportType: 'Weekly', startDate, endDate }); }

  static async BuildMonthlyReport(startDate, endDate) { return this.build({ reportType: 'Monthly', startDate, endDate }); }

  static async GetAllReports() {
    return this.attempt(async () => (await api('/api/reports')).map((r) => new Report(r)), []);
  }

  static async GetReport(reportId) {
    return this.attempt(async () => new Report(await api(`/api/reports/${encodeURIComponent(reportId)}`)), null);
  }
}
