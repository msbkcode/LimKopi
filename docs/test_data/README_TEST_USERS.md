# Lim Kopi — 100 Additional Test Accounts

This is a **separate testing copy**, NOT the original website/database.

- The six original demo accounts are retained without changes (names, passwords, profiles and statuses).
- 100 additional synthetic accounts are present: 1 User Admin, 3 Platform Management, 10 Interior Designers, and 86 Customers.
- Database accounts total: **106**. All additional accounts are Active and use their actor's existing profile.
- Since the original 106-user test build, **additional company, IDP, favourite, view, shortlist and report rows** have been inserted for the assessment demo. See `ASSESSMENT_DATASET.md` for exact table counts.

## Login credentials (local testing only)

| Type | Usernames | Password |
|---|---|---|
| Main demo (six) | `shiyuan`, `yongjun`, `lwin`, `shafiq`, `bryan`, `shaofeng` | `Demo1234!` |
| Extra User Admin (1) | `useradmin01` | `TestData123!` |
| Extra Platform Management (3) | `platformmanger01`–`platformmanger03` | `TestData123!` |
| Extra Interior Designers (10) | `id01`–`id10` | `TestData123!` |
| Extra Customers (86) | `customer01`–`customer86` | `TestData123!` |

The prefix `platformmanger` reflects the **actual registered username**.
Complete list: `NEW_100_ACCOUNTS.csv`.

## Start

Extract separately, open the `limkopi` folder, and launch `RUN_WINDOWS.bat` or run `py server.py`.
Read `ASSESSMENT_DATASET.md` for table counts and demonstration suggestions.
