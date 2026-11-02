const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const config = require('./config');
const pool = require('./db/pool');
const requireAuth = require('./middleware/requireAuth');
const errorHandler = require('./middleware/errorHandler');
const { buildLimiters } = require('./middleware/rateLimit');

// `rateLimit` controls the auth throttling added in Milestone 2:
//   undefined  use the defaults (production and development)
//   false      disable it, so tests that make many logins on purpose are
//              not fighting the limiter
//   object     override windowMs / loginLimit / burstLimit, used by the
//              rate-limit tests to exercise the control with small numbers
function createApp({ rateLimit = config.isTest ? false : undefined } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1);

  app.use(express.json({ limit: '100kb' }));
  app.use(
    session({
      name: 'replog.sid',
      store: new PgStore({ pool, tableName: 'user_sessions' }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true, // not readable from JavaScript, so XSS can't steal it
        sameSite: 'lax', // basic CSRF protection for state-changing requests
        secure: config.isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    }),
  );

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Throttle credential guessing before it reaches the auth routes.
  if (rateLimit !== false) {
    const { loginLimiter, authBurstLimiter } = buildLimiters(rateLimit || {});
    app.use('/api/auth', authBurstLimiter);
    app.use('/api/auth/login', loginLimiter);
  }
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/workouts', requireAuth, require('./routes/workouts'));
  app.use('/api/exercises', requireAuth, require('./routes/exercises'));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
