# Platform Management Reports — targeted update

Updated files: `server.py`, `js/app.js`, `js/entities/Report.js`.
Additional regression tests: `tests/test_reports_features.py` (and an updated no-activity expectation in `tests/test_use_cases.py`).

## What changed

- **Daily, Weekly, Monthly:** manual report generation remains independent and counts actual database records within the chosen Singapore-time period.
- **Report History:** has a report-type filter and separate **View**, **Excel**, and **CSV** actions for each saved report ID.
- **Single report endpoints:** `GET /api/reports/{id}`, `/api/reports/{id}.xlsx`, `/api/reports/{id}.csv`. Only a signed-in Platform Management user with `GENERATE_REPORTS` permission can use them. The previous bulk `/api/reports.xlsx` and `/api/reports.csv` exports are not used.
- **Zero-activity reports:** now saved as snapshots and still return `noData: true`, with the existing empty-period message.
- **Automatic backend scheduling:** startup checks the latest completed day, completed Monday–Sunday week, and completed calendar month; a Python scheduler then runs at 00:05 Singapore time each day. It stores only completed periods, reuses existing report storage, and skips report periods already saved after the period ended. The scheduler runs while `python server.py` is running, even without an open browser. Restart the server after copying updates.
- **Accidental duplicate clicks:** Generate buttons are disabled while their request runs. Intentional manual regeneration of the same period is allowed, preserving distinct historical snapshots.
- **IDP Categories:** checked the sidebar text; the uploaded project already spells **IDP Categories** correctly, so its navigation label remains unchanged.

## How to use

1. **Back up your existing `lim_kopi.db` before copying files.** The uploaded ZIP's database contains **0 reports**. If your working site's database has history, retain that original database: do **not** overwrite it with the database in this ZIP.
2. Copy the updated code files into the corresponding paths in your existing project (or unzip the complete project to a new folder).
3. Run `python server.py`, then sign in as Platform Management.
4. Open **Reports**, Generate a report, then choose **View / Excel / CSV** on that row. Use the filter to show only Daily, Weekly or Monthly reports.
5. Keep the Python server running for scheduled reports; closing the browser does not stop the scheduler, but stopping the Python server does. If the server is restarted, it checks the most recently completed periods.

## Testing

- 4 targeted features tests passed (individual ID export, zero-data snapshot, scheduler idempotence, permission checks).
- 12 existing Daily/Weekly/Monthly report use-case tests passed.
- Python compilation and JavaScript syntax validation passed.
- The complete non-report regression suite was not completed.
