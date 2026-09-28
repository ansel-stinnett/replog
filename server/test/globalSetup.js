// Runs once before the whole suite: rebuild the test database from migrations
// so every run starts from the real schema, not a hand-made one.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const pool = require('../src/db/pool');
  const migrate = require('../src/db/migrate');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate({ log: () => {} });
  await pool.end();
};
