# Threat Model — RepLog

Milestone 2. Scope: the deployed web application (React client, Express API,
PostgreSQL), its session handling, and the data users store in it.

This model covers what RepLog realistically faces as a small personal-data web
app. It is not an exhaustive enterprise assessment; it names the attack
surfaces that exist, what we do about each, and what we knowingly have not
addressed.

## 1. What we are protecting

| Asset | Why it matters | Impact if lost |
|---|---|---|
| Account credentials | Reused passwords put users' other accounts at risk | High |
| Session cookies | Possession of one is full account access | High |
| Workout history | Personal data: training patterns, body-adjacent info | Moderate |
| Database integrity | The application is worthless if records can be altered | High |
| Availability | A training log nobody can reach is useless mid-session | Low–Moderate |

RepLog stores no payment data, no government identifiers, and no health
records. That keeps the blast radius of a breach meaningfully smaller than it
would otherwise be.

## 2. Who we are defending against

- **Opportunistic attackers** running automated credential-stuffing and
  vulnerability scans against anything reachable on the internet. This is the
  realistic, constant threat.
- **A curious logged-in user** who edits URLs and IDs to see whether they can
  reach someone else's data. Plausible for a gym app shared among friends.
- **A network observer** on shared or public Wi-Fi, which is exactly where a
  gym user would be.

Explicitly out of scope: a determined targeted attacker, a malicious hosting
provider, and physical access to the database server. A course project cannot
credibly defend against those, and pretending otherwise would be dishonest.

## 3. Trust boundaries

```
  [ Browser ]  <-- untrusted: everything from here is hostile until validated
       |
       |  HTTPS
       v
  [ Express API ]  <-- the only place authorization decisions are made
       |
       |  parameterized SQL over a private connection
       v
  [ PostgreSQL ]  <-- trusted; not exposed to the internet
```

The important line is the first one. The client is a convenience, not a
control: every rule enforced in React is re-enforced in the API, because
anyone can call the API directly with curl.

## 4. Attack surfaces and what we do about them

### 4.1 Authentication — credential guessing

**Threat.** An attacker takes a known email and tries passwords until one
works, or sprays a common password across many accounts.

**Before Milestone 2.** Each guess was expensive (bcrypt, cost 12) and
uninformative (one generic error for both wrong password and unknown email,
with a dummy hash compared for unknown emails so the timing matches). But the
number of guesses was unlimited.

**Now.** Two rate limiters sit in front of `/api/auth`
(`server/src/middleware/rateLimit.js`):

- per IP **and** submitted email on login, 5 failed attempts per 15 minutes
- per IP across all auth routes, 60 requests per 15 minutes

Only *failed* attempts count toward the login limit. This is deliberate: if
successes counted, an attacker could deliberately fail five times against a
victim's email and lock that person out of their own account, turning our
security control into a denial-of-service tool. Keying on IP *and* email
rather than email alone serves the same purpose.

**Evidence.** `docs/milestone-2/evidence/rate-limit-before.txt` and
`rate-limit-after.txt`, reproducible with `scripts/security-evidence.sh`.
Ten tests in `server/test/rateLimit.test.js`.

**Residual risk.** Counters are in memory, so they are per-process and reset
on deploy. An attacker who knows our deploy schedule, or who can distribute
guesses across many IP addresses, gets more attempts than the numbers above
suggest. Moving the counters into PostgreSQL or Redis is the fix; it is
recorded in the backlog rather than silently skipped.

### 4.2 Authorization — reading someone else's data

**Threat.** A logged-in user changes `/workouts/41` to `/workouts/42` and
sees a stranger's training log. This is the single most likely real
vulnerability in an app shaped like ours.

**Control.** Authorization lives in the data layer, not the UI. Every query in
`workoutRepository` and `exerciseRepository` takes `userId` and filters on it,
so there is no code path that returns a row without an ownership check. A
request for someone else's workout returns **404, not 403** — a 403 would
confirm the record exists, letting an attacker map valid IDs.

**Evidence.** `server/test/isolation.test.js` makes every request as one user
against another's data and asserts both the status and that no fragment of the
other user's content appears in the response body. The filter and personal
record features added this milestone each carry their own isolation tests,
because a new query is a new chance to forget the `WHERE user_id` clause.

**Residual risk.** The guarantee is convention-plus-tests, not a database
constraint. PostgreSQL row-level security would enforce it structurally even
if someone wrote a careless query. Noted for Milestone 3.

### 4.3 Injection

**Threat.** Input crafted to break out of a SQL string.

**Control.** Every query uses bind parameters; no user value is concatenated
into SQL. The one place that composes SQL dynamically is the history filter,
and it builds only the *shape* of the `WHERE` clause from a fixed set of
branches — the values themselves are always `$1`, `$2`, `$3`.

Building that feature surfaced a related bug worth recording: bind parameters
stop injection, but `%` and `_` inside a `LIKE` value are still wildcards, so
searching for `%` returned every workout. The term is now escaped and the
pattern uses `ESCAPE '\'`. The test that caught it is
`"wildcards supplied by the user are matched literally"`.

**Evidence.** Three injection payload tests in
`server/test/historyFilter.test.js`.

### 4.4 Session handling

**Threat.** Stealing or fixing a session cookie.

**Controls.** Sessions are server-side (`connect-pg-simple`); the cookie holds
only an opaque ID. It is `httpOnly` (script cannot read it), `sameSite=lax`
(cross-site form posts do not carry it), `secure` in production (never sent
over plain HTTP), and expires after 7 days. The session ID is regenerated on
login, which closes session fixation.

**Residual risk.** `sameSite=lax` is reasonable CSRF protection for our
same-origin JSON API but is not a CSRF token. Logout destroys the current
session only — a user cannot revoke other devices.

### 4.5 Input validation and resource exhaustion

**Threat.** Malformed or enormous payloads crashing the process or filling the
database.

**Controls.** Request bodies are capped at 100 kB. `validation.js` enforces
per-field bounds before anything reaches the database: at most 30 exercises
per workout, 50 sets per exercise, reps 0–1000, weight 0–9999.99, notes 1000
characters. Database `CHECK` constraints enforce the same bounds a second
time, so a bug in validation cannot corrupt stored data. IDs that are not
positive integers are rejected before a query runs.

### 4.6 Information disclosure through errors

**Threat.** A stack trace or SQL error revealing schema, file paths, or
library versions.

**Controls.** The error handler returns a generic message for anything
unexpected and logs details server-side only. `x-powered-by` is disabled.

**Evidence.** `server/test/errorHandling.test.js` asserts that stack frames,
SQL text, and file paths never appear in a response body.

### 4.7 Transport

HTTPS is terminated by the hosting platform; `trust proxy` is set in
production so the real client IP reaches the rate limiter rather than the
proxy's. Without that, every request would share one rate-limit bucket.

### 4.8 Dependencies

`npm audit` runs locally; CI installs with `npm ci` against a committed
lockfile, so builds are reproducible. We do not yet have automated dependency
update alerts — a Milestone 3 item.

## 5. Known gaps

Listed plainly rather than omitted:

| Gap | Risk | Plan |
|---|---|---|
| Rate-limit counters in memory | Resets on deploy; per-process | Move to Postgres/Redis |
| No row-level security | A careless future query could leak data | Evaluate RLS in M3 |
| No CSRF tokens | `sameSite=lax` only | Acceptable for a same-origin JSON API |
| No account lockout or 2FA | Rate limiting only | Out of scope for the semester |
| No password reset flow | Users cannot recover an account | Backlog |
| Sessions not revocable across devices | Stolen cookie stays valid up to 7 days | Backlog |
| No automated dependency scanning | Known CVEs could sit unnoticed | Dependabot in M3 |

## 6. Summary

The highest-value risks for an app of this shape are broken access control and
credential guessing. The first is addressed structurally, by making ownership
a required argument of every data-layer function and testing it from an
attacker's point of view. The second was the gap this milestone closed. What
remains is documented above rather than left for a grader to discover.
