# Changelog

All notable changes to RepLog are recorded here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-11-02  ·  Milestone 2 (Test It)

Expands the Milestone 1 MVP with two user-facing features, a security
control, and a substantially larger test suite.

### Added

**History search and filtering** (backlog story #11)
- `GET /api/workouts` accepts optional `search`, `from`, and `to` query
  parameters; with none supplied, behaviour is unchanged from Milestone 1
- Search matches a workout's note or any of its exercise names
- Date range filters are inclusive at both ends
- Filter controls on the history page, debounced so typing does not fire a
  request per keystroke, with out-of-order responses discarded
- Empty results distinguish "no workouts yet" from "nothing matched", and
  offer to clear the filters

**Personal records** (backlog story #12)
- The heaviest set ever recorded for each exercise, with reps and date
- Exposed on `GET /api/exercises` and on the progress endpoint
- Ties on weight break to the higher rep count, then to the earlier date, so
  the record credits the session that first achieved it
- The progress page marks a record set in the most recent session

**Security: authentication rate limiting** (OWASP A07)
- 5 failed login attempts per IP + email per 15 minutes
- 60 requests per IP per 15 minutes across all auth routes
- Only failed attempts count, so a correct password is never thrown away and
  an attacker cannot lock a victim out by deliberately failing
- `scripts/security-evidence.sh` reproduces the before/after demonstration

**Testing and quality**
- End-to-end integration tests covering complete user journeys
- Error-handling tests asserting that stack traces, SQL, and file paths never
  reach the client
- Coverage thresholds enforced in CI (85% statements, 90% lines, 90%
  functions, 70% branches)
- Test count grew from 39 to 92; statement coverage from 89.9% to 94.1%

**Documentation**
- Threat model (`docs/milestone-2/threat-model.md`)
- OWASP Top 10 review (`docs/milestone-2/owasp-review.md`)
- QA plan with Definition of Done and review checklist (`docs/milestone-2/qa-plan.md`)
- This changelog

### Fixed

- Search terms containing `%` or `_` were treated as SQL `LIKE` wildcards, so
  searching for `%` returned every workout. The term is now escaped and the
  pattern uses `ESCAPE '\'`. Not an injection vulnerability — bind parameters
  already prevented that — but the same class of mistake. Found by our own
  test before review.

### Security

- Closed the unlimited-password-guessing gap described above. Before this
  release, an attacker could try passwords against a known email as fast as
  the server would answer.

---

## [0.1.0] — 2026-09-28  ·  Milestone 1 (Build It)

First working end-to-end MVP.

### Added

- Account registration and login with bcrypt-hashed passwords (cost 12) and
  server-side sessions stored in PostgreSQL
- Generic error messages and a dummy hash comparison for unknown emails, so
  responses do not reveal which addresses are registered
- Session ID regeneration on login, closing session fixation
- Create, read, update, and delete workouts with exercises and sets
- Workout history, newest first
- Per-exercise progress chart of top set weight over time
- Profile page with display name and basic stats
- Per-user data isolation enforced in the data layer, with tests written from
  an attacker's point of view (story #6)
- Multi-screen responsive React client
- Docker Compose for local development, forward-only migration runner, and a
  seed script with demo accounts and eight weeks of sample history
- GitHub Actions CI running the server suite and a client build

---

## [0.0.1] — 2026-09-21  ·  Milestone 0 (Propose It)

- Project proposal, README, prioritized backlog, and initial architecture

[0.2.0]: https://github.com/ansel-stinnett/replog/releases/tag/v0.2.0
[0.1.0]: https://github.com/ansel-stinnett/replog/releases/tag/v0.1.0
[0.0.1]: https://github.com/ansel-stinnett/replog/releases/tag/v0.0.1
