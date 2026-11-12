# ETM Backend (Weeks 1–8)

REST API for the Esports Tournament Management project. The implemented scope covers authentication and RBAC, accounts, clubs, teams, club members, tournaments, applications, rosters, bracket generation, match scheduling/results, standings, customer predictions, notifications, bans, and immutable match-result audit records.

## Requirements

- Node.js 22+
- MongoDB 7+ (a local standalone server is sufficient for the current code)

## Run locally

```powershell
Copy-Item .env.example .env
npm install
# Import the collection JSON files described below into an empty database.
npm run dev
```

Configure `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, and `CITIZEN_ID_HASH_SECRET` in `.env`. The API uses `PORT` (`5000` in `.env.example`, otherwise `3000`); health check: `GET /api/health`.

## Design decisions

Uploads use Cloudinary for public image/video/document delivery. MongoDB stores URL strings only. See [Cloudinary setup and supported upload scopes](CLOUDINARY_SETUP.md) for signed API credentials or the configured unsigned preset `EsportTM`, with assets stored under `folder/ETM`.

- A `Game` is reference data. `Team` points to one game; `Tournament` points to one game. A club does not directly belong to a game.
- A club member is a person record created by a club manager and does not require a user account.
- CCCD is normalized and stored only as an HMAC plus its last four digits. It is never returned or logged in plaintext.
- `activeFrom` is required, `activeUntil` may be open-ended. Overlap with another club produces a warning instead of blocking creation.
- A member can be assigned to at most one current team through `ClubMember.teamId`; that team determines the game.
- Games referenced by business data are deactivated rather than physically deleted.
- Audit records only preserve who created or corrected a match score, the previous/new score, reason, and time. They reject update/delete operations.

## Main route groups

| Prefix | Purpose |
|---|---|
| `/api/auth` | Register, verify, login, refresh, reset, activate, Google OAuth |
| `/api/users` | Profile and in-app notifications |
| `/api/clubs` | Managed clubs, teams and members |
| `/api/tournaments` | Public listing plus organizer tournament/bracket/report operations |
| `/api/applications` | Team applications, rosters, reviews and roster change requests |
| `/api/matches` | Match schedule and official result |
| `/api/predictions` | Open Pick'em events, customer predictions and leaderboard |
| `/api/admin` | Accounts, clubs, games, templates, bans and audit log |

Import `postman/ETM_Weeks_1_6.postman_collection.json` into Postman. After login, paste the access token into the collection variable `accessToken`.

## Verification

```powershell
npm test
npm run check
```

Week-8 delivery includes public content, protests, violation reports, live security policies, Pick'em events, notification retry/dedupe and result reconciliation. See [delivery and setup](docs/WEEK8_DELIVERY.md) and the [153-task file index](docs/BACKEND_TASK_FILES_WEEK8.md). Run `npm run migrate:week8` before starting this version against an existing database, and sign in again for session-bound tokens.

## Collection JSON data

The [data directory](data/) contains only **25 importable collection JSON files, 806 documents**, matching the current Mongoose models. It includes 4 games, 28 clubs, 36 teams, 216 club members, 7 tournaments and related registrations, rosters, brackets, results, standings, predictions and administration records. `AuthSession` and `AuthToken` start as empty arrays; login generates these runtime records.

Names, team tags and branding were referenced on 2026-11-08 from [LoL Esports](https://lolesports.com/en-GB/) and the EWC competition catalogues for [League of Legends](https://esportsworldcup.com/en/competitions/2025/league-of-legends), [Counter-Strike 2](https://esportsworldcup.com/en/competitions/2025/cs2), [VALORANT](https://esportsworldcup.com/en/competitions/2025/valorant) and [Dota 2](https://esportsworldcup.com/en/competitions/2025/dota2). A club is shared across its game divisions; a team's displayed name/tag can differ from its club's name/tag (for example, Team Liquid / Team Liquid Alienware / TLAW). Public image URLs point to Cloudinary under `folder/ETM/catalog`.

**Project-generated records:** people, identification numbers, managers, contracts, accounts, tournaments, schedules, participants, results, predictions and moderation decisions are generated project data, not official historical competition records or actual player rosters. Club contact emails use official public contact addresses for T1, Gen.G, G2 and Fnatic; other addresses use the project's `etm.local` domain. No emails are sent by the JSON import. Dates are fixed around 2026-11-08; they do not automatically shift when imported later.

### Manual import with MongoDB Compass

1. Select an **empty database** matching the database name in `MONGO_URI`.
2. Create each collection with the exact file stem, for example `users.json` → `users`, `clubmembers.json` → `clubmembers`.
3. Use **Add Data → Import JSON or CSV file → JSON**, selecting the matching file. Import the entire JSON array. The `$oid` and `$date` wrappers are MongoDB Extended JSON: keep them intact so IDs become ObjectIds and timestamps become BSON Dates.
4. For `authsessions.json` and `authtokens.json`, create empty collections; the files contain `[]`. Do not import duplicate files into existing collections.
5. Start the backend normally. Mongoose creates the model indexes; no seed/import script is required. Plain `mongoose.insertMany(JSON.parse(...))` does not decode Extended JSON; use Compass or BSON `EJSON.parse` first.

Recommended order: users → games → clubs → teams → clubmembers → tournaments → tournamentapplications → rosters → brackets → matches → matchresults → standings → pickemevents → predictions → rosterchangerequests → notificationtemplates → notifications → bans → auditrecords → protests → contents → violationreports → securitypolicies. MongoDB does not enforce foreign-key ordering, but all files must be imported for complete pages.

### Project login accounts

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@etm.local` | `Admin@12345` |
| Tournament Organizer | `organizer@etm.local`, `operations@etm.local` | `Organizer@12345` |
| Club Manager | `<club-key>.manager@etm.local`, e.g. `gen.manager@etm.local`, `g2.manager@etm.local`, `teamliquid.manager@etm.local` | `Manager@12345` |
| Customer | `customer1@etm.local` through `customer7@etm.local` | `User@12345` |

`customer8@etm.local` is suspended and linked to an active account restriction. Passwords in `users.json` are bcrypt hashes. These initial project passwords should be changed before public deployment.

CCCDs are generated 12-digit identifiers (`999` + a 9-digit sequence, in `clubmembers.json` order), stored only as `citizenIdHash` and `citizenIdLast4`, as required by the model. Hashes use this workspace's existing `CITIZEN_ID_HASH_SECRET`. Retain that same secret securely on another machine if identity matching must recognize these imported members; the secret is not included in the JSON. Each member has exactly one game/team and a non-overlapping active period.

The previous numbered fixtures, portable loader bundle, ZIP and duplicate seed/import scripts have been removed. The backlog source snapshot is preserved in [docs/backlog-week8-source.json](docs/backlog-week8-source.json).

Match reports: `POST /api/reports` and `GET /api/reports/:id` require ClubManager. Reports target only Match, with category `Kết quả trận đấu` or `Vi phạm luật thi đấu`; the reporter must manage a participating club. Administrator reviews through `/api/admin/reports`, populated with tournament and team context. General account/content/club reports are no longer accepted. Legacy non-Match records are retained but excluded from this workflow. The separate formal protest workflow retains its existing result-correction and deadline rules.
