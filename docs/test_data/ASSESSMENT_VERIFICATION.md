# Expanded Assessment Dataset — Verification Record

This is a record of **checks actually performed** on the separate test website.

## Automated suite

Command: `python tests/run_all.py`

- **215 Python tests — PASS**
- **27 JavaScript tests — PASS**
- **242 total — 242 passed, 0 failed**
- **BUILD SUCCESS**

The existing automated suite creates its **own fresh isolated databases** for its Python tests. These results show that the unchanged website functions and source still pass; they do not alone verify the newly populated demo database.

## Extra integration checks on the populated database

An HTTP server was started against a **disposable copy** of the populated SQLite database. The live API was checked with:

- All six original demo users (`shiyuan`, `yongjun`, `lwin`, `shaofeng`, `shafiq`, `bryan`).
- Seven additional accounts (`useradmin01`, `id01`, `id10`, `platformmanger01`, `platformmanger03`, `customer01`, `customer86`).
- Successful login, expected role, and successful `/api/bootstrap` responses.
- User Admin: all **106 accounts** visible.
- Interior Designer: own companies and own portfolio returned.
- Customer: all **100 public IDPs** returned, favourites/search endpoints worked; non-authorised report access denied.
- Platform Management: daily, weekly, monthly saved reports returned and an individual CSV exported.
- The removed Feasibility Predictor URL does not provide predictor functionality: customers receive a **404**, while other roles are blocked by the existing **403** authorisation checks.

**Result: All 13 tested logins and checked API actions passed.** These checks do not constitute a full browser automation or guarantee every manual UI scenario.

## Database checks

- `PRAGMA integrity_check`: `ok`
- `PRAGMA foreign_key_check`: no violations
- Original records retained **field-for-field** in every table, including six main accounts and 100 added accounts.
- New companies and IDPs belong to valid Interior Designer accounts.
- No IDP is missing its active owner company or active category.
- All `viewCount` and `shortlistCount` values match their corresponding activity-history rows.
- The three saved report snapshots were computed using the existing report-building function.

**Reminder:** This is synthetic test data, not evidence that actual customers or designers participated, and not a claim that browser acceptance tests or GitHub Actions ran during this check.
