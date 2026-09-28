const { pool, resetDb, registeredAgent, sampleWorkout } = require('./helpers');

let agent;
beforeEach(async () => {
  await resetDb();
  agent = await registeredAgent();
});
afterAll(() => pool.end());

describe('create and read (stories #3, #4)', () => {
  test('saves a workout with multiple exercises and sets', async () => {
    const res = await agent.post('/api/workouts').send(sampleWorkout());
    expect(res.status).toBe(201);
    const { workout } = res.body;
    expect(workout.exercises).toHaveLength(2);
    expect(workout.exercises[0].sets).toEqual([
      { setNumber: 1, reps: 5, weight: 185 },
      { setNumber: 2, reps: 5, weight: 185 },
    ]);

    const reread = await agent.get(`/api/workouts/${workout.id}`);
    expect(reread.body.workout).toEqual(workout); // persisted, not just echoed
  });

  test('date defaults to today when omitted', async () => {
    const res = await agent.post('/api/workouts').send(sampleWorkout({ performedOn: undefined }));
    expect(res.status).toBe(201);
    expect(res.body.workout.performedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('rejects an empty submission and negative numbers', async () => {
    expect((await agent.post('/api/workouts').send({})).status).toBe(400);
    const neg = await agent.post('/api/workouts').send(sampleWorkout({
      exercises: [{ name: 'Squat', sets: [{ reps: -1, weight: 100 }] }],
    }));
    expect(neg.status).toBe(400);
  });

  test('reuses an exercise across workouts regardless of name case', async () => {
    await agent.post('/api/workouts').send(sampleWorkout());
    await agent.post('/api/workouts').send(sampleWorkout({
      exercises: [{ name: 'bench press', sets: [{ reps: 3, weight: 195 }] }],
    }));
    const { body } = await agent.get('/api/exercises');
    expect(body.exercises.filter((e) => e.name.toLowerCase() === 'bench press')).toHaveLength(1);
  });
});

describe('history (story #5)', () => {
  test('is empty for a new user', async () => {
    const res = await agent.get('/api/workouts');
    expect(res.body.workouts).toEqual([]);
  });

  test('lists newest first with an exercise summary', async () => {
    await agent.post('/api/workouts').send(sampleWorkout({ performedOn: '2026-09-01' }));
    await agent.post('/api/workouts').send(sampleWorkout({ performedOn: '2026-09-15' }));
    const { body } = await agent.get('/api/workouts');
    expect(body.workouts.map((w) => w.performedOn)).toEqual(['2026-09-15', '2026-09-01']);
    expect(body.workouts[0].exercises[0]).toEqual({ name: 'Bench Press', setCount: 2 });
  });
});

describe('edit and delete (story #7)', () => {
  test('edits persist and replace the old sets', async () => {
    const { body } = await agent.post('/api/workouts').send(sampleWorkout());
    const res = await agent.put(`/api/workouts/${body.workout.id}`).send(sampleWorkout({
      note: 'Edited',
      exercises: [{ name: 'Deadlift', sets: [{ reps: 3, weight: 315 }] }],
    }));
    expect(res.status).toBe(200);
    const reread = await agent.get(`/api/workouts/${body.workout.id}`);
    expect(reread.body.workout.note).toBe('Edited');
    expect(reread.body.workout.exercises.map((e) => e.name)).toEqual(['Deadlift']);
  });

  test('deleted workouts disappear from history', async () => {
    const { body } = await agent.post('/api/workouts').send(sampleWorkout());
    expect((await agent.delete(`/api/workouts/${body.workout.id}`)).status).toBe(204);
    expect((await agent.get('/api/workouts')).body.workouts).toEqual([]);
    expect((await agent.get(`/api/workouts/${body.workout.id}`)).status).toBe(404);
  });

  test('a garbage id is a 404, not a 500', async () => {
    expect((await agent.get('/api/workouts/abc')).status).toBe(404);
    expect((await agent.delete('/api/workouts/-1')).status).toBe(404);
  });
});

describe('progress (story #8)', () => {
  test('returns the top set per date, oldest first', async () => {
    await agent.post('/api/workouts').send(sampleWorkout({
      performedOn: '2026-09-10',
      exercises: [{ name: 'Squat', sets: [{ reps: 5, weight: 225 }, { reps: 3, weight: 245 }] }],
    }));
    await agent.post('/api/workouts').send(sampleWorkout({
      performedOn: '2026-09-03',
      exercises: [{ name: 'Squat', sets: [{ reps: 5, weight: 215 }] }],
    }));
    const { body: list } = await agent.get('/api/exercises');
    const squat = list.exercises.find((e) => e.name === 'Squat');
    const { body } = await agent.get(`/api/exercises/${squat.id}/progress`);
    expect(body.points.map((p) => [p.date, p.topWeight])).toEqual([
      ['2026-09-03', 215],
      ['2026-09-10', 245],
    ]);
  });

  test('handles a single data point', async () => {
    await agent.post('/api/workouts').send(sampleWorkout());
    const { body: list } = await agent.get('/api/exercises');
    const { body } = await agent.get(`/api/exercises/${list.exercises[0].id}/progress`);
    expect(body.points).toHaveLength(1);
  });
});
