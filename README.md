# Lim Kopi — Interior Design Project (IDP) Platform · CSIT314

Designer companies publish company information and current/past IDP portfolios, customers explore and
shortlist designs, User Admin manages role-template **User Profiles** and **User Accounts**, and Platform
Management curates IDP categories and generates daily / weekly / monthly reports. Requirements:
`48_User_Stories_V2.pdf` (48 stories) + 7 team extensions.

## Run

```bash
python server.py            # Python 3.10+, standard library only
# open http://127.0.0.1:8000
```

Windows: double-click `RUN_WINDOWS.bat`. An existing **v1** `lim_kopi.db` is migrated to schema v2
automatically on first start (no rows lost; old public profiles kept in `legacy_member_profiles`).

| Actor | Username | Password |
|---|---|---|
| User Admin | `shiyuan` | `Demo1234!` |
| Interior Designer | `yongjun`, `lwin` | `Demo1234!` |
| Customer | `shafiq`, `bryan` | `Demo1234!` |
| Platform Management | `shaofeng` | `Demo1234!` |

Demo credentials are for local testing only.

## Architecture (Boundary – Control – Entity)

```
js/boundaries/   48 Boundary classes  (CreateUserProfileForm, LoginForm, ViewIDPForm, ...)  -> DOM events, Display*()
js/controllers/  48 Control classes   (CreateUserProfileC, LoginC, SaveFavouriteC, ...)    -> business rules
js/entities/     UserProfile, UserAccount, CompanyInfo, IDP, Favourite, IDPCategory, Report -> REST API
js/app.js        page rendering + event wiring (instantiates Boundaries)
server.py        REST API, permission checks, SQLite, static files
```

Class and method names follow the BCE diagrams in `48_User_Stories_V2.pdf`. CI fails the build if a
Boundary imports an Entity directly or a Control imports a Boundary.

## Tests

```bash
python tests/run_all.py     # 215 Python tests (API, TDD, migration) + 27 JS Boundary/Control tests -> tests/results/results.json
```

The automated suite includes API, regression, migration and JavaScript Boundary/Control tests.
Browser-level acceptance scenarios should also be checked in the website and reported separately.

## Security notes

PBKDF2-HMAC-SHA256 (600k iterations, per-user salt) · HttpOnly SameSite session cookie, token stored as SHA-256 ·
CSRF token on every non-GET request · same-origin check · strict CSP (`script-src 'self'`) · permission-based
authorisation from the User Profile · suspending an account/profile revokes live sessions · parameterised SQL.
