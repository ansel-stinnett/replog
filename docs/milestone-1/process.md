# Software process

## Model: Scrum-lite with one-week sprints

We use a lightweight version of Scrum: a prioritized backlog, one-week
sprints, a short planning session at the start of each sprint, and a review at
the end. We drop the parts of Scrum that exist to coordinate larger teams
(dedicated Scrum Master, formal daily stand-ups) because there are two of us.
We check in over text most days instead.

### Why this model

| Considered | Why not |
|---|---|
| Waterfall | Requirements are clear for the MVP but will change in Milestones 2 and 3 as we learn what's hard. Waterfall would push all testing to the end, right before each deadline. |
| Kanban | Works well for continuous flow, but our work is driven by fixed milestone dates. Time-boxed sprints map directly onto those dates. |
| Full Scrum | The ceremonies cost more than they return for a team of two. |

Scrum-lite fits because the course is already iterative. Each milestone is a
release, and each sprint ends with something runnable on `main`. The backlog
(`BACKLOG.md`, mirrored as GitHub Issues) is the single source of truth for
what's next.

## Artifacts

- **Product backlog:** [`BACKLOG.md`](../../BACKLOG.md). P0 is the MVP, P1 is Milestone 2, P2 is stretch.
- **Sprint board:** GitHub Projects with To do / In progress / In review / Done columns.
- **Increment:** whatever is on `main` at the end of the sprint, tagged at each milestone.

## Workflow

1. Pick an issue from the sprint board and assign yourself.
2. Branch from `main` as `feature/<short-name>` or `fix/<short-name>`.
3. Commit in Conventional Commits style (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
4. Open a pull request that links the issue (`Closes #N`).
5. CI runs the server test suite and the client build on every PR.
6. The other team member reviews. No one merges their own PR, and there are no direct pushes to `main`.

## Definition of Done

A backlog item is done when all of these are true:

- Merged to `main` through a reviewed PR
- Acceptance criteria from the backlog are met
- Automated tests cover the new behavior and the whole suite passes in CI
- README updated if setup, environment variables, or commands changed
- Works end to end from a clean clone using the README steps

## Milestone 1 sprint scope

| Sprint | Goal | Backlog items |
|---|---|---|
| 1 | Data layer and accounts | Schema and migrations, repository layer, stories #1, #2, #6 |
| 2 | Logging, history, progress | Stories #3, #4, #5, #7, #8, seed data, design documents |

## Team split for Milestone 1

| Member | Responsibilities this milestone |
|---|---|
| Ansel Stinnett | API contract, authentication, workout and progress endpoints, React client, CI, design and UX documents |
| Nhan Trinh | Seed script and demo data, data-isolation test suite (story #6), data model document |

Contributions are visible in the pull request history and `git shortlog -sn`.
