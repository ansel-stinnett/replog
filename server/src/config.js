const path = require('path');

// Load the repo-root .env (shared with docker compose). Real environment
// variables take precedence, so CI and hosting can set their own values.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

// Central place for environment configuration. Fails fast on missing values
// so a misconfigured deploy crashes at startup instead of at first request.
const env = process.env.NODE_ENV || 'development';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isTest = env === 'test';

module.exports = {
  env,
  isTest,
  isProduction: env === 'production',
  port: Number(process.env.PORT || 3001),
  databaseUrl: isTest
    ? required('TEST_DATABASE_URL', 'postgres://replog:replog@localhost:5432/replog_test')
    : required('DATABASE_URL'),
  sessionSecret: isTest ? 'test-secret' : required('SESSION_SECRET'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
