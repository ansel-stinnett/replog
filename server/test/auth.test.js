const { app, pool, request, resetDb } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('registration (story #1)', () => {
  test('creates an account, hashes the password, and logs the user in', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({ email: 'New@Example.test', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@example.test');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const { rows } = await pool.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).not.toBe('password123');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
  });

  test('rejects a duplicate email regardless of case', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@example.test', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ email: 'DUP@example.test', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  test('rejects invalid input with field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x', password: '1' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(['email', 'password']));
  });
});

describe('login and logout (story #2)', () => {
  beforeEach(() =>
    request(app).post('/api/auth/register').send({ email: 'lifter@example.test', password: 'password123' }));

  test('correct credentials start a session', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email: 'lifter@example.test', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  test('wrong password and unknown email get the same generic message', async () => {
    const wrongPw = await request(app).post('/api/auth/login').send({ email: 'lifter@example.test', password: 'nope' });
    const noUser = await request(app).post('/api/auth/login').send({ email: 'ghost@example.test', password: 'nope' });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body.error).toBe(noUser.body.error);
  });

  test('logout ends the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'lifter@example.test', password: 'password123' });
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  test('protected routes return 401 when signed out', async () => {
    expect((await request(app).get('/api/workouts')).status).toBe(401);
    expect((await request(app).get('/api/exercises')).status).toBe(401);
  });
});

describe('profile', () => {
  test('updates the display name', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'p@example.test', password: 'password123' });
    const res = await agent.patch('/api/auth/me').send({ displayName: 'Marcus' });
    expect(res.body.user.displayName).toBe('Marcus');
  });
});
