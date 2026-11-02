// Backlog story #11: search and filter workout history.
const { pool, request, app, resetDb, registeredAgent, sampleWorkout } = require('./helpers');

let agent;

beforeEach(async () => {
  await resetDb();
  agent = await registeredAgent();
  await agent.post('/api/workouts').send(
    sampleWorkout({
      performedOn: '2026-09-01',
      note: 'Heavy pressing day',
      exercises: [{ name: 'Bench Press', sets: [{ reps: 5, weight: 185 }] }],
    }),
  );
  await agent.post('/api/workouts').send(
    sampleWorkout({
      performedOn: '2026-09-15',
      note: 'Legs',
      exercises: [{ name: 'Back Squat', sets: [{ reps: 5, weight: 275 }] }],
    }),
  );
  await agent.post('/api/workouts').send(
    sampleWorkout({
      performedOn: '2026-10-01',
      note: 'Deload',
      exercises: [
        { name: 'Bench Press', sets: [{ reps: 8, weight: 135 }] },
        { name: 'Barbell Row', sets: [{ reps: 8, weight: 135 }] },
      ],
    }),
  );
});
afterAll(() => pool.end());

const names = (res) => res.body.workouts.map((w) => w.performedOn);

describe('no filter', () => {
  test('returns every workout, newest first (Milestone 1 behaviour unchanged)', async () => {
    const res = await agent.get('/api/workouts');
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(['2026-10-01', '2026-09-15', '2026-09-01']);
  });
});

describe('text search', () => {
  test('matches an exercise name', async () => {
    const res = await agent.get('/api/workouts').query({ search: 'bench' });
    expect(names(res)).toEqual(['2026-10-01', '2026-09-01']);
  });

  test('matches a workout note', async () => {
    const res = await agent.get('/api/workouts').query({ search: 'deload' });
    expect(names(res)).toEqual(['2026-10-01']);
  });

  test('is case-insensitive and matches partial words', async () => {
    const res = await agent.get('/api/workouts').query({ search: 'SQUA' });
    expect(names(res)).toEqual(['2026-09-15']);
  });

  test('a matching workout still returns all of its exercises, not just the match', async () => {
    const res = await agent.get('/api/workouts').query({ search: 'barbell row' });
    expect(res.body.workouts).toHaveLength(1);
    expect(res.body.workouts[0].exercises.map((e) => e.name).sort()).toEqual(['Barbell Row', 'Bench Press']);
  });

  test('no matches returns an empty list rather than an error', async () => {
    const res = await agent.get('/api/workouts').query({ search: 'kettlebell' });
    expect(res.status).toBe(200);
    expect(res.body.workouts).toEqual([]);
  });
});

describe('date range', () => {
  test('from is inclusive', async () => {
    const res = await agent.get('/api/workouts').query({ from: '2026-09-15' });
    expect(names(res)).toEqual(['2026-10-01', '2026-09-15']);
  });

  test('to is inclusive', async () => {
    const res = await agent.get('/api/workouts').query({ to: '2026-09-15' });
    expect(names(res)).toEqual(['2026-09-15', '2026-09-01']);
  });

  test('from and to together bound both ends', async () => {
    const res = await agent.get('/api/workouts').query({ from: '2026-09-10', to: '2026-09-20' });
    expect(names(res)).toEqual(['2026-09-15']);
  });

  test('search and date range combine', async () => {
    const res = await agent.get('/api/workouts').query({ search: 'bench', from: '2026-09-20' });
    expect(names(res)).toEqual(['2026-10-01']);
  });
});

describe('invalid filters', () => {
  test('rejects a malformed date', async () => {
    const res = await agent.get('/api/workouts').query({ from: 'yesterday' });
    expect(res.status).toBe(400);
    expect(res.body.fields.from).toMatch(/real date/);
  });

  test('rejects a date that does not exist', async () => {
    const res = await agent.get('/api/workouts').query({ to: '2026-02-30' });
    expect(res.status).toBe(400);
  });

  test('rejects a reversed range', async () => {
    const res = await agent.get('/api/workouts').query({ from: '2026-10-01', to: '2026-09-01' });
    expect(res.status).toBe(400);
    expect(res.body.fields.to).toMatch(/on or after/);
  });

  test('rejects an over-long search string', async () => {
    const res = await agent.get('/api/workouts').query({ search: 'x'.repeat(81) });
    expect(res.status).toBe(400);
  });
});

describe('search input is data, never SQL (OWASP A03)', () => {
  test("a quote-and-comment payload is treated as literal text", async () => {
    const res = await agent.get('/api/workouts').query({ search: "'; DROP TABLE workouts; --" });
    expect(res.status).toBe(200);
    expect(res.body.workouts).toEqual([]);
    // The table is still there and still holds every row.
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM workouts');
    expect(rows[0].n).toBe(3);
  });

  test('an always-true payload does not bypass the filter', async () => {
    const res = await agent.get('/api/workouts').query({ search: "' OR '1'='1" });
    expect(res.body.workouts).toEqual([]);
  });

  test('wildcards supplied by the user are matched literally, not as patterns', async () => {
    // '%' would match everything if it were interpolated into the LIKE pattern
    // unescaped; as a bind parameter it is just a character to look for.
    const res = await agent.get('/api/workouts').query({ search: '%' });
    expect(res.body.workouts).toEqual([]);
  });
});

describe('filtering respects data isolation (story #6)', () => {
  test("another user's search never reaches these workouts", async () => {
    const bob = await registeredAgent('bob@example.test');
    const res = await bob.get('/api/workouts').query({ search: 'bench' });
    expect(res.body.workouts).toEqual([]);
  });

  test('filters require a session', async () => {
    const res = await request(app).get('/api/workouts').query({ search: 'bench' });
    expect(res.status).toBe(401);
  });
});
