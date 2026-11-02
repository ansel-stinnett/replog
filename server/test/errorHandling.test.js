// The error handler is the last link in the middleware chain. These tests
// check the property that matters for security as well as usability: a
// failure returns a useful status and a generic message, and never leaks a
// stack trace, SQL, or file paths to the client (OWASP A05).
const express = require('express');
const request = require('supertest');
const createApp = require('../src/app');
const errorHandler = require('../src/middleware/errorHandler');
const { pool, resetDb, registeredAgent } = require('./helpers');

const app = createApp();

beforeEach(resetDb);
afterAll(() => pool.end());

describe('malformed requests', () => {
  test('a body that is not valid JSON gets 400, not a crash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken"');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid JSON/i);
  });

  test('an oversized body is refused with 413', async () => {
    const agent = await registeredAgent();
    const res = await agent
      .post('/api/workouts')
      .send({ performedOn: '2026-09-01', note: 'x'.repeat(200_000), exercises: [] });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  test('an unknown API route returns a JSON 404', async () => {
    const res = await request(app).get('/api/not-a-real-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found.');
  });
});

describe('unexpected failures', () => {
  // A tiny app whose only job is to throw, so we can exercise the 500 path
  // without breaking the real one.
  function appThatThrows(err) {
    const probe = express();
    probe.get('/boom', (req, res, next) => next(err));
    probe.use(errorHandler);
    return probe;
  }

  test('an unexpected error becomes a generic 500', async () => {
    const res = await request(appThatThrows(new Error('kaboom'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong on the server.' });
  });

  test('no stack trace, SQL, or file path reaches the client', async () => {
    const err = new Error('relation "users" does not exist at /srv/app/src/db/pool.js');
    const res = await request(appThatThrows(err)).get('/boom');

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/relation|pool\.js|\/srv\//);
    expect(body).not.toMatch(/at Object|at Function/); // stack frames
    expect(res.body).not.toHaveProperty('stack');
  });

  test('a database error message is not echoed back', async () => {
    const dbErr = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      table: 'users',
    });
    const res = await request(appThatThrows(dbErr)).get('/boom');
    expect(JSON.stringify(res.body)).not.toMatch(/duplicate key|23505|users/);
  });
});

describe('response hardening', () => {
  test('the server does not advertise its framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });
});
