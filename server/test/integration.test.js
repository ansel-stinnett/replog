// End-to-end integration tests for the main user flows.
//
// Unlike the unit-level suites, each test here walks a complete journey
// through the real app and a real database: register, log in, log a workout,
// read it back, filter it, and check the record. If the pieces stop fitting
// together, these fail even when every individual piece still passes.
const { app, pool, request, resetDb } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('a new user from sign-up to first progress view', () => {
  test('registers, logs a workout, and sees it in history and progress', async () => {
    const agent = request.agent(app);

    // 1. Register. The account is created and the session starts immediately.
    const registered = await agent
      .post('/api/auth/register')
      .send({ email: 'marcus@example.test', password: 'password123', displayName: 'Marcus' });
    expect(registered.status).toBe(201);
    expect(registered.body.user.displayName).toBe('Marcus');

    // 2. History starts empty.
    const emptyHistory = await agent.get('/api/workouts');
    expect(emptyHistory.body.workouts).toEqual([]);

    // 3. Log a session.
    const created = await agent.post('/api/workouts').send({
      performedOn: '2026-10-05',
      note: 'First session',
      exercises: [
        { name: 'Bench Press', sets: [{ reps: 8, weight: 135 }, { reps: 6, weight: 155 }] },
        { name: 'Back Squat', sets: [{ reps: 5, weight: 225 }] },
      ],
    });
    expect(created.status).toBe(201);
    const workoutId = created.body.workout.id;

    // 4. It appears at the top of history with a correct summary.
    const history = await agent.get('/api/workouts');
    expect(history.body.workouts).toHaveLength(1);
    expect(history.body.workouts[0]).toMatchObject({ id: workoutId, note: 'First session' });
    expect(history.body.workouts[0].exercises).toEqual(
      expect.arrayContaining([
        { name: 'Bench Press', setCount: 2 },
        { name: 'Back Squat', setCount: 1 },
      ]),
    );

    // 5. Opening it returns every set, in order.
    const detail = await agent.get(`/api/workouts/${workoutId}`);
    const benchDetail = detail.body.workout.exercises.find((e) => e.name === 'Bench Press');
    expect(benchDetail.sets).toEqual([
      { setNumber: 1, reps: 8, weight: 135 },
      { setNumber: 2, reps: 6, weight: 155 },
    ]);

    // 6. The exercise now exists with a personal record attached.
    const exercises = await agent.get('/api/exercises');
    const bench = exercises.body.exercises.find((e) => e.name === 'Bench Press');
    expect(bench.timesPerformed).toBe(1);
    expect(bench.personalRecord).toMatchObject({ weight: 155, reps: 6, date: '2026-10-05' });

    // 7. Progress charts that session.
    const progress = await agent.get(`/api/exercises/${bench.id}/progress`);
    expect(progress.body.points).toEqual([
      expect.objectContaining({ date: '2026-10-05', topWeight: 155, reps: 6 }),
    ]);

    // 8. The profile reflects the logged work.
    const me = await agent.get('/api/auth/me');
    expect(me.body.stats.workoutCount).toBe(1);
  });
});

describe('a returning user across sessions', () => {
  test('logs out, logs back in, and still sees their data', async () => {
    const first = request.agent(app);
    await first.post('/api/auth/register').send({ email: 'priya@example.test', password: 'password123' });
    await first.post('/api/workouts').send({
      performedOn: '2026-10-01',
      exercises: [{ name: 'Lat Pulldown', sets: [{ reps: 10, weight: 90 }] }],
    });
    await first.post('/api/auth/logout');

    // The old agent's cookie is dead.
    expect((await first.get('/api/workouts')).status).toBe(401);

    // A fresh login sees the same history.
    const second = request.agent(app);
    const login = await second.post('/api/auth/login').send({ email: 'priya@example.test', password: 'password123' });
    expect(login.status).toBe(200);

    const history = await second.get('/api/workouts');
    expect(history.body.workouts).toHaveLength(1);
    expect(history.body.workouts[0].exercises[0].name).toBe('Lat Pulldown');
  });
});

describe('editing and deleting a logged session', () => {
  test('an edit replaces the sets and history follows', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'edit@example.test', password: 'password123' });

    const { body } = await agent.post('/api/workouts').send({
      performedOn: '2026-10-01',
      note: 'Typo here',
      exercises: [{ name: 'Deadlift', sets: [{ reps: 5, weight: 225 }] }],
    });
    const id = body.workout.id;

    const updated = await agent.put(`/api/workouts/${id}`).send({
      performedOn: '2026-10-02',
      note: 'Fixed',
      exercises: [{ name: 'Deadlift', sets: [{ reps: 3, weight: 315 }] }],
    });
    expect(updated.status).toBe(200);

    const detail = await agent.get(`/api/workouts/${id}`);
    expect(detail.body.workout.note).toBe('Fixed');
    expect(detail.body.workout.performedOn).toBe('2026-10-02');
    expect(detail.body.workout.exercises[0].sets).toEqual([{ setNumber: 1, reps: 3, weight: 315 }]);

    // The record reflects the edit, not the original entry.
    const exercises = await agent.get('/api/exercises');
    expect(exercises.body.exercises[0].personalRecord.weight).toBe(315);
  });

  test('a deleted workout disappears from history', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'del@example.test', password: 'password123' });
    const { body } = await agent.post('/api/workouts').send({
      performedOn: '2026-10-01',
      exercises: [{ name: 'Overhead Press', sets: [{ reps: 5, weight: 95 }] }],
    });

    expect((await agent.delete(`/api/workouts/${body.workout.id}`)).status).toBe(204);
    expect((await agent.get('/api/workouts')).body.workouts).toEqual([]);
    expect((await agent.get(`/api/workouts/${body.workout.id}`)).status).toBe(404);
  });
});

describe('finding an old session with the filters', () => {
  test('search narrows a long history to the right workout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'search@example.test', password: 'password123' });

    for (const [date, name] of [
      ['2026-08-01', 'Bench Press'],
      ['2026-09-01', 'Back Squat'],
      ['2026-10-01', 'Deadlift'],
    ]) {
      await agent.post('/api/workouts').send({
        performedOn: date,
        exercises: [{ name, sets: [{ reps: 5, weight: 135 }] }],
      });
    }

    expect((await agent.get('/api/workouts')).body.workouts).toHaveLength(3);

    const squatOnly = await agent.get('/api/workouts').query({ search: 'squat' });
    expect(squatOnly.body.workouts).toHaveLength(1);
    expect(squatOnly.body.workouts[0].performedOn).toBe('2026-09-01');

    const september = await agent.get('/api/workouts').query({ from: '2026-09-01', to: '2026-09-30' });
    expect(september.body.workouts).toHaveLength(1);
  });
});

describe('two users on the same server never see each other', () => {
  test('parallel accounts keep separate history, exercises, and records', async () => {
    const alice = request.agent(app);
    const bob = request.agent(app);
    await alice.post('/api/auth/register').send({ email: 'alice@example.test', password: 'password123' });
    await bob.post('/api/auth/register').send({ email: 'bob@example.test', password: 'password123' });

    await alice.post('/api/workouts').send({
      performedOn: '2026-10-01',
      note: 'Alice only',
      exercises: [{ name: 'Bench Press', sets: [{ reps: 1, weight: 405 }] }],
    });
    await bob.post('/api/workouts').send({
      performedOn: '2026-10-01',
      note: 'Bob only',
      exercises: [{ name: 'Bench Press', sets: [{ reps: 10, weight: 95 }] }],
    });

    const aliceHistory = await alice.get('/api/workouts');
    const bobHistory = await bob.get('/api/workouts');
    expect(aliceHistory.body.workouts).toHaveLength(1);
    expect(bobHistory.body.workouts).toHaveLength(1);
    expect(JSON.stringify(bobHistory.body)).not.toMatch(/Alice only|405/);

    const bobExercises = await bob.get('/api/exercises');
    expect(bobExercises.body.exercises[0].personalRecord.weight).toBe(95);
  });
});
