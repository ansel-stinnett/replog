const request = require('supertest');
const createApp = require('../src/app');
const pool = require('../src/db/pool');

const app = createApp();

async function resetDb() {
  await pool.query('TRUNCATE users, user_sessions RESTART IDENTITY CASCADE');
}

// Returns a supertest agent that keeps the session cookie between requests.
async function registeredAgent(email = 'lifter@example.test', password = 'password123') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ email, password });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

const sampleWorkout = (overrides = {}) => ({
  performedOn: '2026-09-20',
  note: 'Felt strong',
  exercises: [
    { name: 'Bench Press', sets: [{ reps: 5, weight: 185 }, { reps: 5, weight: 185 }] },
    { name: 'Barbell Row', sets: [{ reps: 8, weight: 135 }] },
  ],
  ...overrides,
});

module.exports = { app, pool, request, resetDb, registeredAgent, sampleWorkout };
