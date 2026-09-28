// Repository pattern: all SQL touching `users` lives here, so route handlers
// never build queries and tests can reason about data access in one place.
const pool = require('../db/pool');

const PUBLIC_COLUMNS = 'id, email, display_name AS "displayName", created_at AS "createdAt"';

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

// Returns null instead of throwing when the email is already taken.
async function create({ email, passwordHash, displayName }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING ${PUBLIC_COLUMNS}`,
      [email, passwordHash, displayName],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') return null; // unique_violation
    throw err;
  }
}

async function updateDisplayName(id, displayName) {
  const { rows } = await pool.query(
    `UPDATE users SET display_name = $2 WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [id, displayName],
  );
  return rows[0] || null;
}

async function stats(userId) {
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM workouts WHERE user_id = $1) AS "workoutCount",
       (SELECT count(*)::int FROM exercises WHERE user_id = $1) AS "exerciseCount",
       (SELECT max(performed_on) FROM workouts WHERE user_id = $1) AS "lastWorkoutOn"`,
    [userId],
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create, updateDisplayName, stats };
