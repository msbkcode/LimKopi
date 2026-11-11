# Lim Kopi — Expanded Assessment Demonstration Dataset

**This is a separate, synthetic TESTING copy**, built from `LimKopi_TESTING_106_Accounts_Predictor_Fully_Removed.zip`. The original group submission source and the previous test ZIP were not altered. **Feasibility Predictor remains fully removed.**

## Database record counts

| Table / data type | Before | Added | Final |
|---|---:|---:|---:|
| User accounts | 106 | 0 | **106** |
| User profile role templates | 4 | 0 | **4** |
| Companies | 2 | 10 | **12** |
| Interior Design Projects (IDPs) | 4 | 96 | **100** |
| Categories | 3 | 0 | **3** |
| Customer favourites | 3 | 97 | **100** |
| IDP view events | 67 | 83 | **150** |
| IDP shortlist events | 3 | 97 | **100** |
| Saved activity reports | 0 | 3 | **3** |
| Active sessions (at packaging) | 0 | 0 | **0** |

The test database has **53 current IDPs and 47 past IDPs**. All 10 additional designers (`id01`–`id10`) have one sample company and 9–10 sample projects each. The 86 new test customers (`customer01`–`customer86`) have synthetic favourites and view/shortlist activity distributed among them. Every project belongs to an existing active category and is visible through an active designer company.

This is **representative assessment-scale data**. Four role templates and three categories are intentionally retained because they model distinct roles and categories rather than repeated transactions. There are 12 companies because there are 12 designer accounts. These tables are **not** inflated to 100 solely to satisfy a literal count.

## Sample credentials — local testing only

- Original six demo users: usernames `shiyuan`, `yongjun`, `lwin`, `shafiq`, `bryan`, `shaofeng`, password `Demo1234!`.
- 100 additional accounts: `useradmin01`, `platformmanger01`–`platformmanger03`, `id01`–`id10`, `customer01`–`customer86`, password `TestData123!`.
- Full account list: `docs/test_data/NEW_100_ACCOUNTS.csv`.
- Note: the username prefix **`platformmanger`** is the existing registered spelling; do not substitute `platformmanager`.

## Realistic usage in the demo

1. **User Admin (`shiyuan`)**: open *User Accounts* and confirm all 106 accounts with their four role templates.
2. **Interior Designer (`id01`)**: view their own company, current IDPs and past IDPs; inspect view and shortlist counts.
3. **Customer (`customer01`)**: search the 100 publicly visible IDPs, view project details and inspect their saved favourites.
4. **Platform Management (`shaofeng`)**: browse categories and open the saved *Daily*, *Weekly*, and *Monthly* reports; optionally generate a new report for a selected period.

These additional records are **synthetic, not real customers, real companies or real renovation transactions**. Example companies use a synthetic UEN-like code, test-domain email and a fictional address. Project images are offline placeholder gradients so the demo works without external image loading.

## Reports

Three reports were created using the application's own `server.build_report()` reporting function, not by inserting arbitrary statistics. They cover the following SGT date ranges:

- Daily: **11 Nov 2026**
- Weekly: **5–11 Nov 2026** (valid 7-day range)
- Monthly: **1–11 Nov 2026** (valid range within a calendar month)

For each of these ranges at generation time: 96 new IDPs, 83 new views, 97 new shortlists, 100 new accounts, 100 active IDPs, 3 active categories. Previously seeded events from October are outside these ranges. If you generate reports later, totals can differ after further actions on the live database.

**Note**: When the site starts, its existing scheduler may create extra completed-period reports. That is expected behaviour and does not mean the seeded reports are corrupted.

## Integrity and verification

- Original rows in *every* database table were compared field-for-field before and after insertion and remained unchanged.
- Database foreign keys: `PRAGMA foreign_key_check` returned no violations.
- Database integrity: `PRAGMA integrity_check` returned `ok`.
- Each IDP's `viewCount` matches its `view_events` count; `shortlistCount` matches its `shortlist_events` count.
- Both stage/completion-date constraints and the owner-company visibility relationship were checked.
- Existing site source, design, Boundary–Control–Entity code, and test cases were not altered.

**This is test data, not 100 test cases.** Passing local automated tests, if reported separately, does not substitute for documenting browser acceptance testing or a live demonstration of this dataset.
