// Backlog story #12: a user can see their personal record for each exercise.
const { pool, request, app, resetDb, registeredAgent, sampleWorkout } = require('./helpers');

let agent;

const bench = (performedOn, sets) =>
  sampleWorkout({ performedOn, note: null, exercises: [{ name: 'Bench Press', sets }] });

beforeEach(async () => {
  await resetDb();
  agent = await registeredAgent();
});
afterAll(() => pool.end());

async function exerciseId(name = 'Bench Press') {
  const { body } = await agent.get('/api/exercises');
  return body.exercises.find((e) => e.name === name).id;
}

describe('personal record calculation', () => {
  test('is the heaviest single set across every session', async () => {
    await agent.post('/api/workouts').send(bench('2026-09-01', [{ reps: 5, weight: 185 }]));
    await agent.post('/api/workouts').send(bench('2026-09-08', [{ reps: 3, weight: 225 }]));
    await agent.post('/api/workouts').send(bench('2026-09-15', [{ reps: 8, weight: 155 }]));

    const res = await agent.get(`/api/exercises/${await exerciseId()}/progress`);
    expect(res.body.personalRecord).toMatchObject({ weight: 225, reps: 3, date: '2026-09-08' });
  });

  test('considers every set in a session, not just the first', async () => {
    await agent.post('/api/workouts').send(
      bench('2026-09-01', [
        { reps: 10, weight: 135 },
        { reps: 5, weight: 185 },
        { reps: 1, weight: 245 },
        { reps: 8, weight: 155 },
      ]),
    );
    const res = await agent.get(`/api/exercises/${await exerciseId()}/progress`);
    expect(res.body.personalRecord).toMatchObject({ weight: 245, reps: 1 });
  });

  test('breaks a tie on weight by the higher rep count', async () => {
    await agent.post('/api/workouts').send(bench('2026-09-01', [{ reps: 3, weight: 225 }]));
    await agent.post('/api/workouts').send(bench('2026-09-08', [{ reps: 6, weight: 225 }]));
    const res = await agent.get(`/api/exercises/${await exerciseId()}/progress`);
    expect(res.body.personalRecord).toMatchObject({ weight: 225, reps: 6, date: '2026-09-08' });
  });

  test('on an equal weight and rep count, credits the earlier session', async () => {
    await agent.post('/api/workouts').send(bench('2026-09-01', [{ reps: 5, weight: 200 }]));
    await agent.post('/api/workouts').send(bench('2026-09-20', [{ reps: 5, weight: 200 }]));
    const res = await agent.get(`/api/exercises/${await exerciseId()}/progress`);
    expect(res.body.personalRecord.date).toBe('2026-09-01');
  });

  test('handles a bodyweight exercise logged at zero weight', async () => {
    await agent.post('/api/workouts').send(
      sampleWorkout({ performedOn: '2026-09-01', exercises: [{ name: 'Pull Up', sets: [{ reps: 12, weight: 0 }] }] }),
    );
    const res = await agent.get(`/api/exercises/${await exerciseId('Pull Up')}/progress`);
    expect(res.body.personalRecord).toMatchObject({ weight: 0, reps: 12 });
  });

  test('keeps decimal weights exact', async () => {
    await agent.post('/api/workouts').send(bench('2026-09-01', [{ reps: 5, weight: 102.5 }]));
    const res = await agent.get(`/api/exercises/${await exerciseId()}/progress`);
    expect(res.body.personalRecord.weight).toBe(102.5);
  });
});

describe('exercise list', () => {
  test('carries each exercise personal record', async () => {
    await agent.post('/api/workouts').send(
      sampleWorkout({
        performedOn: '2026-09-01',
        exercises: [
          { name: 'Bench Press', sets: [{ reps: 5, weight: 185 }] },
          { name: 'Back Squat', sets: [{ reps: 5, weight: 275 }] },
        ],
      }),
    );
    const { body } = await agent.get('/api/exercises');
    const byName = Object.fromEntries(body.exercises.map((e) => [e.name, e.personalRecord]));
    expect(byName['Bench Press']).toMatchObject({ weight: 185, reps: 5 });
    expect(byName['Back Squat']).toMatchObject({ weight: 275, reps: 5 });
  });

  test('a deleted workout no longer counts toward the record', async () => {
    const { body: heavy } = await agent.post('/api/workouts').send(bench('2026-09-08', [{ reps: 1, weight: 300 }]));
    await agent.post('/api/workouts').send(bench('2026-09-01', [{ reps: 5, weight: 185 }]));
    expect((await agent.get(`/api/exercises/${await exerciseId()}/progress`)).body.personalRecord.weight).toBe(300);

    await agent.delete(`/api/workouts/${heavy.workout.id}`);
    expect((await agent.get(`/api/exercises/${await exerciseId()}/progress`)).body.personalRecord.weight).toBe(185);
  });
});

describe('records are private to their owner (story #6)', () => {
  test("one user's heavy set never appears in another user's record", async () => {
    await agent.post('/api/workouts').send(bench('2026-09-01', [{ reps: 1, weight: 405 }]));

    const bob = await registeredAgent('bob@example.test');
    await bob.post('/api/workouts').send(bench('2026-09-02', [{ reps: 5, weight: 135 }]));

    const { body } = await bob.get('/api/exercises');
    const bobBench = body.exercises.find((e) => e.name === 'Bench Press');
    expect(bobBench.personalRecord.weight).toBe(135);
  });

  test("another user's exercise id returns 404, not their record", async () => {
    await agent.post('/api/workouts').send(bench('2026-09-01', [{ reps: 1, weight: 405 }]));
    const aliceExerciseId = await exerciseId();

    const bob = await registeredAgent('bob@example.test');
    const res = await bob.get(`/api/exercises/${aliceExerciseId}/progress`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/405/);
  });

  test('records require a session', async () => {
    expect((await request(app).get('/api/exercises')).status).toBe(401);
  });
});
