# Milestone 2 — Test It

Everything submitted for Milestone 2, with where to find it.

| Deliverable | Location |
|---|---|
| Working application | `main` at tag `milestone-2` |
| New features since Milestone 1 | This document, section 1 |
| Unit and integration tests | `server/test/` — 92 tests across 9 suites |
| Coverage report | `evidence/coverage-summary.txt`, justified in `qa-plan.md` |
| Quality-assurance plan | `qa-plan.md` |
| Code review evidence | Pull requests on GitHub |
| Cross-viewport testing | `evidence/viewports/` |
| Threat model | `threat-model.md` |
| Security control | Rate limiting — `server/src/middleware/rateLimit.js` |
| Before/after security evidence | `evidence/rate-limit-before.txt`, `evidence/rate-limit-after.txt` |
| OWASP Top 10 review | `owasp-review.md` |
| Changelog | `/CHANGELOG.md` |
| Tagged releases | `v0.1.0` (Milestone 1), `v0.2.0` (Milestone 2) |

---

## 1. New features since Milestone 1

### History search and filtering (story #11)

Milestone 1 showed every workout in one list, newest first. Once a user has
logged a couple of months of sessions, finding a specific one means scrolling.
This adds search and date filtering.

Search matches a workout's note or any exercise name within it. It is applied
with a SQL `EXISTS` subquery rather than a join, so a workout that matches on
one exercise still comes back with its complete exercise list rather than only
the matching rows — a subtlety that a join would get wrong.

Date filtering is inclusive at both ends. Filters combine.

On the client, requests are debounced by 250ms so typing does not fire one
request per keystroke, and a response that arrives after a newer one has been
sent is discarded rather than overwriting fresher results.

### Personal records (story #12)

Each exercise now carries the heaviest single set ever recorded for it, with
the rep count and the date.

This is computed server-side across every set, not just the top sets already
drawn on the progress chart, so a heavy single buried in the middle of a
session still counts. Ties on weight break to the higher rep count, then to
the earlier date, so the record credits the session that first achieved it
rather than the most recent repeat.

The progress page marks a record set in the most recent session. The "new"
state is indicated in words as well as colour, so it does not depend on colour
alone.

---

## 2. Security control: authentication rate limiting

**The gap.** Milestone 1 made each password guess expensive (bcrypt cost 12)
and uninformative (one generic error, with a dummy hash compared for unknown
emails so timing matched). What it did not do was limit *how many* guesses an
attacker could make. A script could try passwords against a known email as
fast as the server would answer.

**The control.** Two limiters on `/api/auth`:

- per IP **and** submitted email on login — 5 failed attempts per 15 minutes
- per IP across all auth routes — 60 requests per 15 minutes

**The design decision worth noting.** Only *failed* attempts count toward the
login limit. If successes counted, an attacker could deliberately fail five
times against a victim's email and lock that person out of their own account —
turning our security control into a denial-of-service tool. Keying on IP *and*
email rather than email alone serves the same purpose.

**Evidence.** Both files in `evidence/` were produced by
`scripts/security-evidence.sh` against a running server.

Before — eight wrong passwords, eight answers:

```
ATTEMPT   STATUS  MEANING
1         401     rejected, but the guess was answered
...
8         401     rejected, but the guess was answered
```

After — the sixth attempt onward is refused:

```
ATTEMPT   STATUS  MEANING
1-5       401     rejected, but the guess was answered
6         429     BLOCKED by rate limit
7         429     BLOCKED by rate limit
8         429     BLOCKED by rate limit
```

Reproduce it:

```bash
npm run dev --prefix server          # in one terminal
./scripts/security-evidence.sh       # in another
```

**Known limitation.** Counters are in memory, so they are per-process and
reset on deploy. Recorded in the threat model rather than left implicit.

---

## 3. Testing

| | Milestone 1 | Milestone 2 |
|---|---|---|
| Test suites | 4 | 9 |
| Tests | 39 | 92 |
| Statements | 89.89% | 94.05% |
| Lines | 94.57% | 97.39% |
| Functions | 92.72% | 98.46% |
| Branches | 73.14% | 78.20% |

New suites:

- `historyFilter.test.js` (19) — filtering, including SQL injection payloads
- `personalRecords.test.js` (11) — ties, bodyweight sets, decimals, deletion
- `rateLimit.test.js` (10) — the security control, including that it does not
  lock out legitimate users
- `integration.test.js` (6) — complete end-to-end user journeys
- `errorHandling.test.js` (7) — malformed input and information disclosure

Thresholds are enforced in CI (`coverageThreshold` in `server/package.json`),
so coverage cannot quietly erode. The target and the reasoning behind not
chasing 100% are in `qa-plan.md`.

**A bug our tests caught.** While writing the injection tests for the search
filter, one assertion failed: searching for `%` returned every workout. Bind
parameters had correctly prevented injection, but `%` and `_` inside a `LIKE`
value are still wildcards. Fixed by escaping the term with `ESCAPE '\'`. Not
a security hole, but the same class of mistake — treating user input as
syntax rather than data — and worth recording because the test found it
before a reviewer did.

---

## 4. Code review

`main` is protected: every change reaches it through a pull request reviewed
by the other team member. Nobody merges their own work unreviewed.

Pull requests for this milestone:

| PR | Branch | Author | Reviewer |
|---|---|---|---|
| #3 | `feature/history-filter` | Ansel | Nhan |
| #4 | `feature/personal-records` | Ansel | Nhan |
| #5 | `feature/login-rate-limit` | Nhan | Ansel |
| #6 | `docs/milestone-2` | Nhan | Ansel |

Review runs against the checklist in `qa-plan.md`, which includes a required
security pass: does every new query filter on `user_id`, is user input passed
as a bind parameter, does a not-authorized response return 404 rather than
confirming existence.

---

## 5. Verification

Full instructions are in the root `README.md`. The short version for a clean
checkout:

```bash
git clone https://github.com/ansel-stinnett/replog.git
cd replog
git checkout milestone-2
cp .env.example .env
docker compose up -d db
npm ci --prefix server && npm ci --prefix client
npm run migrate --prefix server && npm run seed --prefix server
npm run dev --prefix server      # terminal 1
npm run dev --prefix client      # terminal 2
```

Then `http://localhost:5173`, sign in as `demo@replog.test` / `demo1234`.

Run the tests:

```bash
npm test --prefix server
npm run test:coverage --prefix server
```

Observe the security control:

```bash
./scripts/security-evidence.sh
```

---

## 6. Deferred to Milestone 3

Stated plainly rather than left to be noticed:

- **Routine templates** (stories #9, #10). Scoped out to keep two features
  finished rather than three half-done. Priya's persona in the proposal
  depends on this, so it is first in line for Milestone 3.
- **Automated client-side tests.** React components are covered by manual
  checks; the API they call is well covered.
- **`helmet` security headers** — no CSP, `X-Frame-Options`, or HSTS yet.
- **Persistent rate-limit storage** — counters currently reset on deploy.
- **Structured security logging** — the weakest area in the OWASP review.
- **Dependabot** — `npm audit` is run by hand today.
