// Milestone 2 security control: login rate limiting (OWASP A07).
//
// The shared test app disables the limiter so the other suites can log in
// freely. These tests build their own app with the control switched on and
// small thresholds, so the behaviour under test is the real middleware.
const request = require('supertest');
const createApp = require('../src/app');
const { pool, resetDb } = require('./helpers');

const LIMIT = 5;

const CREDS = { email: 'lifter@example.test', password: 'password123' };
const wrong = (email = CREDS.email) => ({ email, password: 'not-the-password' });

// The limiter keeps its counters in memory for the life of the app, so each
// test gets a freshly built app. Otherwise attempts from one test would carry
// into the next and the suite would depend on execution order.
let app;

beforeEach(async () => {
  await resetDb();
  app = createApp({ rateLimit: { windowMs: 60_000, loginLimit: LIMIT, burstLimit: 200 } });
  await request(app).post('/api/auth/register').send(CREDS);
});
afterAll(() => pool.end());

describe('failed logins are throttled', () => {
  test(`the first ${LIMIT} wrong passwords are rejected normally, then further attempts are blocked`, async () => {
    const statuses = [];
    for (let i = 0; i < LIMIT + 3; i += 1) {
      statuses.push((await request(app).post('/api/auth/login').send(wrong())).status);
    }
    expect(statuses.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(401));
    expect(statuses.slice(LIMIT)).toEqual([429, 429, 429]);
  });

  test('a blocked response says to wait and leaks nothing about the account', async () => {
    for (let i = 0; i < LIMIT; i += 1) await request(app).post('/api/auth/login').send(wrong());
    const res = await request(app).post('/api/auth/login').send(wrong());

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many attempts/i);
    expect(JSON.stringify(res.body)).not.toMatch(/password|email is incorrect/i);
  });

  test('a correct password is refused once the limit is reached', async () => {
    for (let i = 0; i < LIMIT; i += 1) await request(app).post('/api/auth/login').send(wrong());
    const res = await request(app).post('/api/auth/login').send(CREDS);
    expect(res.status).toBe(429);
  });

  test('RateLimit headers tell a well-behaved client how long to back off', async () => {
    // draft-7 format: a single combined header, e.g. "limit=5, remaining=4, reset=60".
    const res = await request(app).post('/api/auth/login').send(wrong());
    expect(res.headers.ratelimit).toMatch(/limit=5/);
    expect(res.headers.ratelimit).toMatch(/remaining=4/);
    expect(res.headers['ratelimit-policy']).toBeDefined();
  });
});

describe('the control does not punish legitimate use', () => {
  test('successful logins never count toward the limit', async () => {
    for (let i = 0; i < LIMIT + 5; i += 1) {
      const res = await request(app).post('/api/auth/login').send(CREDS);
      expect(res.status).toBe(200);
    }
  });

  test('a few wrong attempts followed by the right password still succeed', async () => {
    for (let i = 0; i < LIMIT - 1; i += 1) await request(app).post('/api/auth/login').send(wrong());
    const res = await request(app).post('/api/auth/login').send(CREDS);
    expect(res.status).toBe(200);
  });

  test('guessing one account does not lock a different account out', async () => {
    await request(app).post('/api/auth/register').send({ email: 'other@example.test', password: 'password123' });
    for (let i = 0; i < LIMIT + 2; i += 1) await request(app).post('/api/auth/login').send(wrong());

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.test', password: 'password123' });
    expect(res.status).toBe(200);
  });

  test('registration is not blocked by failed logins', async () => {
    for (let i = 0; i < LIMIT + 2; i += 1) await request(app).post('/api/auth/login').send(wrong());
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newcomer@example.test', password: 'password123' });
    expect(res.status).toBe(201);
  });
});

describe('burst limiting across the auth routes', () => {
  test('a flood of requests from one address is eventually refused', async () => {
    const burstApp = createApp({ rateLimit: { windowMs: 60_000, loginLimit: 100, burstLimit: 4 } });
    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await request(burstApp).post('/api/auth/login').send(wrong(`u${i}@example.test`))).status);
    }
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});

describe('before the control existed', () => {
  test('an unlimited app answers every guess, which is the behaviour this fixes', async () => {
    const unlimited = createApp({ rateLimit: false });
    const statuses = [];
    for (let i = 0; i < 10; i += 1) {
      statuses.push((await request(unlimited).post('/api/auth/login').send(wrong())).status);
    }
    // Ten guesses, ten answers, no throttling -- the Milestone 1 behaviour.
    expect(statuses).toEqual(Array(10).fill(401));
  });
});
