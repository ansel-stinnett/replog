// Backlog story #6: a user can only see and edit their own workouts.
// Every request below is made by Bob against Alice's data and must fail
// without revealing anything about it.
const { pool, resetDb, registeredAgent, sampleWorkout } = require('./helpers');

let alice;
let bob;
let aliceWorkoutId;
let aliceExerciseId;

beforeEach(async () => {
  await resetDb();
  alice = await registeredAgent('alice@example.test');
  bob = await registeredAgent('bob@example.test');
  const { body } = await alice.post('/api/workouts').send(sampleWorkout());
  aliceWorkoutId = body.workout.id;
  aliceExerciseId = body.workout.exercises[0].exerciseId;
});
afterAll(() => pool.end());

test("Bob can't read Alice's workout and gets no data back", async () => {
  const res = await bob.get(`/api/workouts/${aliceWorkoutId}`);
  expect(res.status).toBe(404);
  expect(res.body).not.toHaveProperty('workout');
  expect(JSON.stringify(res.body)).not.toMatch(/Bench Press|Felt strong/);
});

test("Bob's history doesn't include Alice's workouts", async () => {
  const res = await bob.get('/api/workouts');
  expect(res.body.workouts).toEqual([]);
});

test("Bob can't edit Alice's workout", async () => {
  const res = await bob.put(`/api/workouts/${aliceWorkoutId}`).send(sampleWorkout({ note: 'hacked' }));
  expect(res.status).toBe(404);
  const { body } = await alice.get(`/api/workouts/${aliceWorkoutId}`);
  expect(body.workout.note).toBe('Felt strong');
});

test("Bob can't delete Alice's workout", async () => {
  expect((await bob.delete(`/api/workouts/${aliceWorkoutId}`)).status).toBe(404);
  expect((await alice.get(`/api/workouts/${aliceWorkoutId}`)).status).toBe(200);
});

test("Bob can't see Alice's exercises or progress", async () => {
  expect((await bob.get('/api/exercises')).body.exercises).toEqual([]);
  expect((await bob.get(`/api/exercises/${aliceExerciseId}/progress`)).status).toBe(404);
});

test('a missing workout and a forbidden one look identical', async () => {
  const forbidden = await bob.get(`/api/workouts/${aliceWorkoutId}`);
  const missing = await bob.get('/api/workouts/999999');
  expect(forbidden.status).toBe(missing.status);
  expect(forbidden.body).toEqual(missing.body);
});
