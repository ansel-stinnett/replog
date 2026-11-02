# OWASP Top 10 Review — RepLog

Milestone 2. Each category below is assessed against the code as it actually
stands, with a file or test named as evidence. Categories that do not apply to
this application say so and explain why, rather than being padded with generic
advice.

Reference: OWASP Top 10 (2021).

---

## A01 — Broken Access Control  ·  **Highest relevance**

One logged-in user reaching another's workouts is the most plausible real
vulnerability in an app of this shape.

**What we do.** Authorization is enforced in the data layer, not the UI. Every
function in `workoutRepository` and `exerciseRepository` takes `userId` as a
required argument and filters on it, so there is no path that returns a row
without an ownership check:

```js
// workoutRepository.remove
DELETE FROM workouts WHERE id = $1 AND user_id = $2
```

`requireAuth` sets `req.userId` from the server-side session; the client never
supplies a user ID, so it cannot be forged by editing a request.

A request for another user's record returns **404, not 403**. A 403 would
confirm the record exists, letting an attacker enumerate valid IDs.

**Evidence.** `server/test/isolation.test.js` runs every operation as one user
against another's data and asserts both the status code and that no fragment
of the other user's content appears in the body. Both features added this
milestone carry their own isolation tests — a new query is a new chance to
forget a `WHERE user_id` clause.

**Gap.** The guarantee is convention plus tests, not a database constraint.
Row-level security would enforce it structurally. Milestone 3 candidate.

---

## A02 — Cryptographic Failures

**What we do.** Passwords are hashed with bcrypt at cost 12, never stored or
logged in plain text, and never returned by the API — handlers destructure
`passwordHash` off the object before responding. HTTPS is terminated by the
host. Session cookies are `secure` in production.

**Evidence.** `auth.test.js` reads the stored hash directly from the database
and asserts it is a bcrypt digest rather than the submitted password, and that
no response body contains a `passwordHash` field.

**Gap.** `SESSION_SECRET` comes from the environment with no rotation
procedure. Rotating it invalidates every session, which is acceptable but
undocumented.

---

## A03 — Injection

**What we do.** Every query uses bind parameters. The history filter is the
only place that composes SQL dynamically, and it builds the *shape* of the
`WHERE` clause from a fixed set of branches — values are always `$1`, `$2`,
`$3`. There is no string concatenation of user input anywhere in the data
layer.

Output is rendered by React, which escapes interpolated values by default. We
use no `dangerouslySetInnerHTML`.

**Evidence.** `historyFilter.test.js` sends `'; DROP TABLE workouts; --` and
`' OR '1'='1` as search terms, asserts an empty result, and then confirms the
table still holds every row.

**Finding from this milestone.** Bind parameters stop injection, but `%` and
`_` inside a `LIKE` value are still wildcards — searching for `%` returned
every workout. Not an injection vulnerability, but the same class of mistake:
treating user input as syntax rather than data. Fixed by escaping the term and
adding `ESCAPE '\'` to the pattern. Caught by our own test before review.

---

## A04 — Insecure Design

**What we do.** Two design decisions carry real security weight:

1. **Ownership is a required parameter**, not an optional filter. A developer
   cannot accidentally write a query that forgets it, because the function
   signature will not let them.
2. **The rate limiter counts only failed logins.** If successes counted, an
   attacker could lock a victim out of their own account by failing five times
   against their email — turning a security control into a denial-of-service
   weapon. This is the kind of design flaw that no amount of correct
   implementation would fix.

**Gap.** No password reset flow exists, so a user who forgets their password
has no recovery path. That is a design gap, not an implementation bug.

---

## A05 — Security Misconfiguration

**What we do.** `x-powered-by` is disabled. The error handler returns a
generic message for unexpected failures and logs detail server-side only.
`.env` is gitignored; only `.env.example` is committed, with no real values.
Configuration fails fast at startup if a required variable is missing, so a
misconfigured deploy crashes immediately rather than running insecurely.
`trust proxy` is enabled in production so the rate limiter sees real client
IPs rather than the proxy's.

**Evidence.** `errorHandling.test.js` asserts no stack frames, SQL text, or
file paths reach the client, and that `x-powered-by` is absent.

**Gap.** No security headers middleware (`helmet`): we do not set CSP,
`X-Frame-Options`, or HSTS. Cheap to add; Milestone 3.

---

## A06 — Vulnerable and Outdated Components

**What we do.** Dependencies are pinned by a committed lockfile and installed
with `npm ci` in CI, so builds are reproducible. The dependency list is small
and all direct dependencies are current major versions.

**Gap.** No automated scanning. `npm audit` is run by hand, which means it
gets run when someone remembers. Dependabot is a Milestone 3 item.

---

## A07 — Identification and Authentication Failures  ·  **Control implemented this milestone**

**What we do.**

- bcrypt at cost 12, so each guess is computationally expensive
- one generic error — "Email or password is incorrect" — for both wrong
  password and unknown email, so the response cannot be used to discover which
  emails are registered
- a dummy hash compared when the email is unknown, so an unregistered email
  takes about as long to reject as a registered one and timing does not leak
  the difference
- session ID regenerated on login, closing session fixation
- **new in Milestone 2:** rate limiting on `/api/auth`, 5 failed logins per
  IP + email per 15 minutes, plus a 60-request burst limit per IP

**Evidence.** `rateLimit.test.js` (10 tests) and the captured before/after
output in `evidence/`. The "before" run shows eight wrong passwords all
answered with 401; the "after" run shows five 401s followed by 429s.

**Gap.** No 2FA, no account lockout, no breached-password check. Rate limit
counters are in memory and reset on deploy.

---

## A08 — Software and Data Integrity Failures

**What we do.** CI runs the full test suite with a coverage threshold on every
pull request. The client loads no third-party scripts from CDNs — everything
is bundled by Vite from locked dependencies, so there is no runtime
supply-chain surface in the browser.

**Gap.** No signed commits or artifact signing. Disproportionate for a course
project.

---

## A09 — Security Logging and Monitoring Failures

**What we do.** Unexpected errors are logged server-side. Rate limit
rejections are visible as 429s in the hosting platform's request logs.

**Gap.** This is our weakest category, and we would rather say so than claim
otherwise. There is no structured logging, no record of authentication
failures as security events, and no alerting. A successful attack would
probably go unnoticed. Honest assessment: adequate for a course project,
inadequate for anything real.

---

## A10 — Server-Side Request Forgery (SSRF)

**Not applicable.** RepLog makes no outbound HTTP requests. There is no
endpoint that accepts a URL or fetches a remote resource, so the category has
no surface here. Recorded as not-applicable rather than padded.

---

## Summary

| Category | Status |
|---|---|
| A01 Broken Access Control | Addressed, tested from an attacker's view |
| A02 Cryptographic Failures | Addressed |
| A03 Injection | Addressed; one related bug found and fixed |
| A04 Insecure Design | Addressed; password reset gap noted |
| A05 Security Misconfiguration | Mostly addressed; no `helmet` |
| A06 Vulnerable Components | Partially; no automated scanning |
| A07 Authentication Failures | **Control implemented this milestone** |
| A08 Integrity Failures | Addressed proportionally |
| A09 Logging and Monitoring | **Weakest area; acknowledged** |
| A10 SSRF | Not applicable |

Milestone 3 priorities, in order: `helmet` security headers, Dependabot,
persistent rate-limit storage, and structured authentication-event logging.
