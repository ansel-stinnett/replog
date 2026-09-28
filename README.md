# RepLog

A workout tracking web application. Users log exercises, sets, reps, and weight,
organize them into routines, and review their training history and progress over time.

**Course:** CS 415/515 — Software Design and Development
**Team:** Ansel Stinnett, Nhan Trinh
**Status:** Milestone 1 — working MVP: accounts, workout logging, history, and per-exercise progress.
Design documents for this milestone are in [`docs/milestone-1/`](docs/milestone-1/README.md).

---

## Problem

Workout records end up scattered across notes apps, paper notebooks, and memory,
or never get written down at all. That makes it hard to answer basic questions:
Am I lifting more than I was two months ago? When did I last train legs?
RepLog gives lifters one place to record a session and see progress without
maintaining a spreadsheet by hand.

## Target users

- **Primary:** people who train regularly and want a low-friction way to log
  sessions and see progress trends.
- **Secondary:** beginners who need structure — prebuilt routines and a clear
  record of what they did last time.

## MVP scope (Milestone 1)

**In scope**

- Account registration and login
- Create, edit, and delete a workout session
- Add exercises to a session with sets, reps, and weight
- View workout history, most recent first
- View a per-exercise progress view (weight over time)

**Out of scope for the MVP**

- Social features, sharing, following
- Mobile native apps
- Wearable or health-platform integrations
- Nutrition or calorie tracking
- Coach/client accounts

**Possible later features**

- Reusable routine templates
- Personal-record detection and highlights
- Rest timer
- CSV export

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) | Team familiarity; component model fits a multi-screen UI |
| Backend | Node.js + Express | Same language across the stack; small, well-documented REST surface |
| Database | PostgreSQL | Relational data (users → workouts → exercises → sets) with real constraints |
| Auth | Session or JWT with hashed passwords | Required for per-user data isolation |
| Local dev | Docker Compose | One command to bring up API + database identically on any machine |
| CI | GitHub Actions | Lint and test on every pull request |

## Architecture

```
┌──────────────┐     HTTPS      ┌──────────────────┐     SQL     ┌──────────────┐
│   Browser    │ ─────────────▶ │  Express REST    │ ──────────▶ │  PostgreSQL  │
│  React SPA   │ ◀───────────── │  API             │ ◀────────── │              │
└──────────────┘   JSON         └──────────────────┘             └──────────────┘
                                        │
                                        │  auth middleware
                                        ▼
                                 session / token store
```

Main entities: `users`, `workouts`, `exercises`, `workout_exercises`, `sets`.

---

## Getting started

### Prerequisites

- Node.js 20 or later
- npm 10.x or later
- Docker and Docker Compose (for the database)
- Git

### Setup

```bash
git clone https://github.com/ansel-stinnett/replog.git
cd replog

# copy the example environment file and fill in values
cp .env.example .env

# start the database
docker compose up -d db

# install dependencies
npm install --prefix server
npm install --prefix client

# create tables and load sample data
npm run migrate --prefix server
npm run seed --prefix server

# run the API (port 3001) and the client (port 5173)
npm run dev --prefix server
npm run dev --prefix client
```

The application will be available at `http://localhost:5173`.

### Environment variables

Documented in `.env.example`. No real secrets are committed to the repository.

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgres://replog:replog@localhost:5432/replog` |
| `PORT` | API port | `3001` |
| `TEST_DATABASE_URL` | Database used only by `npm test` (wiped on every run) | `postgres://replog:replog@localhost:5432/replog_test` |
| `SESSION_SECRET` | Signs session cookies | *(generate a random value; command in `.env.example`)* |
| `NODE_ENV` | Runtime mode | `development` |

### Demonstration accounts

Created by the seed script:

| Email | Password | Notes |
|---|---|---|
| `demo@replog.test` | `demo1234` | Has ~8 weeks of sample workout history |
| `empty@replog.test` | `demo1234` | New account with no data, for first-run testing |

### Running tests

```bash
npm test --prefix server              # unit and integration tests
npm run test:coverage --prefix server # coverage report
```

Tests run against `replog_test`, which `docker compose` creates alongside the
main database. The suite rebuilds that database from the migrations on every
run, so it never touches your dev data.

> If you created the Docker volume before `docker/initdb/` existed, the test
> database won't exist yet. Run `docker compose down -v && docker compose up -d db`
> once to recreate it.

### API

The REST contract is documented in [`docs/milestone-1/design.md`](docs/milestone-1/design.md#api-contract).
All routes are under `/api`; everything except register, login, and health requires a session.

---

## Verification guide for the TA

1. Follow the setup steps above; the API and client should both start without errors.
2. Log in as `demo@replog.test`.
3. Create a new workout, add an exercise with two sets, and save it.
4. Confirm the new workout appears at the top of the history list.
5. Open the progress view for that exercise and confirm the new entry appears.
6. Edit that workout, then delete it, and confirm it disappears from history.
7. Log out, then log in as `empty@replog.test` and confirm the empty states on History and Progress.
8. Run the test command above and confirm the suite passes. `test/isolation.test.js`
   is the automated check that one user can't read, edit, or delete another's workouts.

If a public deployment exists, its URL is listed at the top of this README in
addition to these local instructions.

---

## Development process

- **Branching:** `main` is protected. Work happens on `feature/<short-name>` or
  `fix/<short-name>` branches.
- **Pull requests:** every change reaches `main` through a PR reviewed by the
  other team member. No direct pushes to `main`.
- **Commits:** Conventional Commits style — `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- **Issue tracking:** GitHub Issues, grouped in a GitHub Projects board.
- **Sprints:** one week.
- **Definition of Done:** code merged to `main`, tests written and passing,
  reviewed by the other member, README updated if setup changed, and the feature
  works end to end in a clean local checkout.

## Milestone plan

| Milestone | Goal | Tag |
|---|---|---|
| 0 | Proposal, repository, backlog, architecture | `milestone-0` |
| 1 | Working end-to-end MVP with auth and logging | `milestone-1` |
| 2 | Expanded features, tests, coverage, security controls | `milestone-2` |
| 3 | Containerized, CI/CD, deployed at a public URL, `v1.0` | `milestone-3` |

Every milestone tag points at a runnable version of the application.

## Repository layout

```
replog/
├── client/                 # React (Vite) frontend
│   └── src/pages/          # one component per screen
├── server/                 # Express API
│   ├── src/routes/         # HTTP layer: parse, validate, respond
│   ├── src/repositories/   # all SQL lives here
│   ├── src/middleware/     # auth guard, error handler
│   ├── src/db/             # migrations, runner, seed
│   └── test/               # Jest + Supertest
├── docs/                   # proposal and milestone design documents
├── docker/initdb/          # creates the test database on first start
├── .github/workflows/      # CI: server tests + client build on every PR
├── docker-compose.yml
├── .env.example
└── README.md
```

## Team

| Member | Focus |
|---|---|
| Ansel Stinnett | Ansel will design the REST API contract and implement authentication and the workout-logging features across the frontend and help with the backend. |
| Nhan Trinh | Backend and database development; testing and debugging support |

## Milestone 1 contributions

- **Ansel Stinnett:** Designed the REST API contract and implemented authentication, the workout and progress endpoints, and the React client. Set up CI and wrote the process, requirements, design, component-design, and UX documents.
- **Nhan Trinh:** Built the seed script and demo data, wrote the data-isolation test suite for story #6, and wrote the data model document. Reviewed and merged the MVP pull request.

## License

Coursework for CS 415/515. Not licensed for outside use.
