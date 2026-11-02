# Quality Assurance Plan — RepLog

Milestone 2. How we decide a change is finished, what we test and at which
level, and the checklist a reviewer actually works through.

## 1. Definition of Done

A change is done when every line is true:

- [ ] The feature works end to end against a clean database (`npm run migrate && npm run seed`)
- [ ] Automated tests cover the new behaviour, including at least one failure case
- [ ] If the change touches a data-layer query, it has an isolation test proving one user cannot reach another's rows
- [ ] `npm test` passes locally and in CI
- [ ] Coverage stays above the thresholds in `server/package.json`
- [ ] The other team member has reviewed the pull request and left a written comment
- [ ] README and docs updated if setup, environment, or verification steps changed
- [ ] The branch merges cleanly into `main` with no leftover conflict markers

## 2. Testing strategy

We test at three levels, chosen so each one catches something the others
cannot.

### Unit — pure logic, no database

`validation.test.js` exercises the validation rules directly: boundary values,
malformed dates, out-of-range reps and weights. These are fast and exhaustive
because nothing has to be set up.

### Integration — real app, real database

Most of our suite lives here, and deliberately so. The risks that actually
matter in this application are about how the pieces fit together — does the
session carry, does the `WHERE user_id` clause hold, does a filtered query
still return the full exercise list. Mocking the database would test our
mocks rather than our SQL.

Tests run through `supertest` against the real Express app and a real
PostgreSQL instance. `globalSetup.js` rebuilds the test database from the
actual migrations before the suite, so the schema under test is the schema we
ship. Each test truncates and starts clean.

### End-to-end flows

`integration.test.js` walks complete user journeys: register, log a workout,
read it back, filter it, check the record, log out, log back in. These catch
breakages that unit tests miss because every individual piece still passes.

### Manual

Cross-viewport checks and anything involving real browser rendering. Recorded
in section 5.

## 3. Coverage target and its justification

**Target: 85% statements, 90% lines, 90% functions, 70% branches**, enforced
by `coverageThreshold` in `server/package.json`. CI fails below these, so the
number cannot quietly erode.

**Current: 94.05% statements, 97.39% lines, 98.46% functions, 78.2% branches**
across 92 tests.

We set the threshold below current coverage on purpose. A threshold equal to
current coverage fails the build on any unrelated refactor, which trains
people to lower the threshold instead of writing tests. A margin of a few
points leaves room for honest change while still catching a real drop.

**Why not 100%.** The uncovered remainder is almost entirely defensive code
whose failure modes cannot be triggered without faking infrastructure
failures: the `config.js` branch that throws when an environment variable is
missing, the pg type parser's null path, and a transaction rollback that needs
a mid-query database error. Writing tests for those would mean mocking the
database into failing — testing the mock, not the code. Branch coverage sits
lower than statement coverage for the same reason: most uncovered branches are
`??` and `||` fallbacks on values that are never null in practice.

We would rather have 94% that reflects real behaviour than 100% padded with
tests that assert nothing.

## 4. Code review checklist

The reviewer works through this on every pull request. Review is required —
`main` is protected and no one merges their own work.

**Correctness**
- [ ] Does it do what the PR description says?
- [ ] Are failure cases handled, not just the happy path?
- [ ] Are boundaries covered — empty list, single item, zero, maximum?

**Security**
- [ ] Does every new query filter on `user_id`?
- [ ] Is all user input passed as a bind parameter, never concatenated?
- [ ] Does a not-authorized response return 404 rather than confirming existence?
- [ ] Does any new error message leak schema, paths, or account existence?

**Tests**
- [ ] Do the new tests fail if the feature is reverted? (If not, they test nothing.)
- [ ] Is there an isolation test for new data-layer code?

**Maintainability**
- [ ] Do comments explain *why*, not restate *what*?
- [ ] Does it follow existing patterns, or is there a reason it shouldn't?
- [ ] Is the client/server boundary respected — no business rule enforced only in React?

**Accessibility and responsiveness** (client changes)
- [ ] Do interactive elements keep a 44px touch target?
- [ ] Is every input labelled?
- [ ] Is meaning carried by something other than colour alone?
- [ ] Does it work at 375px without horizontal scrolling?

## 5. Manual test checklist

Run before tagging a milestone, on a clean clone.

**Setup**
- [ ] `git clone`, `cp .env.example .env`, `docker compose up -d db`
- [ ] `npm ci` in both `server/` and `client/`
- [ ] `npm run migrate && npm run seed` succeeds
- [ ] Both dev servers start without errors

**Core flows**
- [ ] Register a new account; land logged in
- [ ] Log out and log back in
- [ ] Log a workout with two exercises and multiple sets
- [ ] It appears at the top of history with the right summary
- [ ] Edit it; changes persist after reload
- [ ] Delete it; it disappears
- [ ] Progress chart renders for a logged exercise
- [ ] Personal record shows the heaviest set

**Milestone 2 features**
- [ ] Search by exercise name narrows the list
- [ ] Search by note text works
- [ ] Date range filters both ends inclusively
- [ ] Clearing filters restores the full list
- [ ] An empty result explains itself and offers to clear
- [ ] Six wrong passwords in a row produce a "too many attempts" message
- [ ] A correct password still works after one or two wrong attempts

**Security spot checks**
- [ ] Log in as `demo@replog.test`, note a workout ID; log in as
      `empty@replog.test` and request that ID directly — expect 404
- [ ] Search for `'; DROP TABLE workouts; --` — expect no results and no error
- [ ] Request `/api/workouts` with no session — expect 401

**Viewports** — 375px, 768px, 1440px
- [ ] No horizontal scrolling
- [ ] Filter controls usable; full-width on phone
- [ ] Chart and table readable
- [ ] Navigation reachable

## 6. Bug handling

Bugs become GitHub Issues with reproduction steps. Anything affecting data
isolation or authentication is fixed before other work. A fix includes a test
that fails without it — otherwise nothing stops it coming back.

## 7. Known limitations

Stated here rather than left to be discovered:

- No automated client-side tests. React components are covered by manual
  checks only; the API they depend on is well covered. Component tests are a
  Milestone 3 item.
- Cross-browser testing is Chrome and Firefox on desktop plus Chrome DevTools
  device emulation. No real iOS device testing.
- No load or performance testing. Expected usage is a handful of users with a
  few hundred workouts each.
