const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const config = require('./config');
const pool = require('./db/pool');
const requireAuth = require('./middleware/requireAuth');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
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
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/workouts', requireAuth, require('./routes/workouts'));
  app.use('/api/exercises', requireAuth, require('./routes/exercises'));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
