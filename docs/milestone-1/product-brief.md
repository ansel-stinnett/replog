# Product brief and MVP scope (updated for Milestone 1)

## Product

RepLog is a web app for logging strength workouts: exercises, sets, reps, and
weight. It keeps every session in one place and shows whether each lift is
trending up, so lifters don't have to maintain a notes file or spreadsheet.

## Users

| Persona | Need | Constraint |
|---|---|---|
| Marcus, 24, consistent lifter | Fast entry during a session; see if a lift is going up | Logs one-handed, between sets, on a phone |
| Priya, 19, new to the gym | Remember what she did last week; know whether she's progressing | Unfamiliar with lifting terms, so labels must be plain |

## MVP scope as delivered

| # | Story | Status |
|---|---|---|
| 1 | Create an account | Done |
| 2 | Log in and log out | Done |
| 3 | Create a workout with a date and optional note | Done |
| 4 | Add exercises with sets, reps, and weight | Done |
| 5 | View workout history, newest first | Done |
| 6 | Only see and edit my own workouts | Done, verified by `server/test/isolation.test.js` |
| 7 | Edit or delete a workout | Done |
| 8 | See progress on one exercise over time | Done (chart plus table) |

Also delivered beyond the P0 list: a profile screen with display name and
basic stats, and CI that runs the server tests and client build on every pull
request.

## Changes since the Milestone 0 proposal

These are small, deliberate refinements, not scope changes:

- **Auth decided:** server-side sessions instead of JWT. See ADR-001 in [design.md](design.md#adr-001-postgresql-with-server-side-sessions).
- **Exercises are per-user and matched case-insensitively,** so "bench press" and "Bench Press" chart as one lift.
- **"Empty submission" defined:** a workout needs at least one exercise with at least one set.
- **Units:** weights are in pounds for the MVP. A unit setting is a candidate for later.
- **Routines** (listed under planned features in the proposal) remain P1 for Milestone 2, as in the backlog.

## Out of scope

Unchanged from the proposal: social features, native mobile apps, wearable
integrations, nutrition tracking, coach/client accounts, and payments.

## Next (Milestone 2)

Routine templates, history search and filter, personal records, expanded unit
and integration tests with a coverage target, a threat model, rate limiting on
login, and an OWASP Top 10 review. See [`BACKLOG.md`](../../BACKLOG.md) P1.
