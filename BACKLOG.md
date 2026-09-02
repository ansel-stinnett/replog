# Prioritized Backlog

Priority order. P0 items must ship for the Milestone 1 MVP; P1 items are the
Milestone 2 expansion; P2 items are stretch goals for Milestone 3 or beyond.

Each item should become a GitHub Issue with the same title so the board and this
file stay in sync.

---

## P0 — MVP (Milestone 1)

| # | User story | Acceptance criteria |
|---|---|---|
| 1 | As a visitor, I can create an account so my workouts are saved to me. | Email and password accepted; password stored hashed, never in plain text; duplicate email is rejected with a clear message; user lands logged in. |
| 2 | As a returning user, I can log in and log out. | Correct credentials start a session; wrong credentials show a generic failure message; logout ends the session; protected pages redirect to login when signed out. |
| 3 | As a user, I can create a workout session with a date and optional note. | Session saves and appears in history; date defaults to today; empty submission is rejected. |
| 4 | As a user, I can add exercises with sets, reps, and weight to a session. | Multiple exercises per session; multiple sets per exercise; reps and weight validated as non-negative numbers; values persist after reload. |
| 5 | As a user, I can view my workout history. | History lists my sessions newest first; shows date and exercise summary; shows an empty state when there are no workouts. |
| 6 | As a user, I can only see and edit my own workouts. | Requesting another user's workout by ID returns 403/404, never their data; verified by an automated test. |
| 7 | As a user, I can edit or delete a workout I recorded. | Edits persist; delete asks for confirmation; deleted sessions disappear from history. |
| 8 | As a user, I can see my progress on a single exercise over time. | Chart or table of weight per date for a chosen exercise; handles a single data point without breaking. |

### Supporting technical tasks (P0)

- Database schema and migrations for `users`, `workouts`, `exercises`, `workout_exercises`, `sets`
- Seed script with demo accounts and sample history
- Auth middleware and route protection
- REST API contract documented
- Multi-screen React routing (login, history, session editor, progress, profile)
- `.env.example` and environment documentation
- Basic responsive layout

---

## P1 — Expansion and hardening (Milestone 2)

| # | User story / task |
|---|---|
| 9 | As a user, I can save a session as a reusable routine template. |
| 10 | As a user, I can start a new workout prefilled from a routine. |
| 11 | As a user, I can search or filter my history by exercise or date range. |
| 12 | As a user, I see my personal record for each exercise. |
| 13 | Unit tests across API handlers and business logic, with a justified coverage target. |
| 14 | Integration tests for register → login → log workout → view history. |
| 15 | Threat model covering auth, data isolation, and input handling. |
| 16 | Implemented security control (rate limiting on login, or strict authorization checks) with before/after evidence. |
| 17 | OWASP Top 10 review of the relevant categories. |
| 18 | Cross-viewport testing evidence (desktop, tablet, phone widths). |
| 19 | Changelog and second tagged release. |

---

## P2 — Stretch (Milestone 3 or later)

| # | Item |
|---|---|
| 20 | Rest timer during a live session |
| 21 | CSV export of workout history |
| 22 | Volume-per-muscle-group dashboard |
| 23 | Body-weight tracking alongside lifts |
| 24 | Dark mode |

---

## Explicitly out of scope

Social feed, following, or sharing; native mobile apps; wearable and health
platform integrations; nutrition tracking; coach/client account types; payments.

These are recorded here so scope creep is a deliberate decision rather than an accident.
