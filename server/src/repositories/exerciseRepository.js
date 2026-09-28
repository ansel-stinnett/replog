const pool = require('../db/pool');

// Looks up an exercise by name for this user, creating it if needed.
// `db` lets callers pass a transaction client.
async function findOrCreate(userId, name, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO exercises (user_id, name) VALUES ($1, $2)
     ON CONFLICT (user_id, lower(name)) DO UPDATE SET name = exercises.name
     RETURNING id, name`,
    [userId, name],
  );
  return rows[0];
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT e.id, e.name,
            count(DISTINCT we.workout_id)::int AS "timesPerformed",
            max(w.performed_on) AS "lastPerformedOn"
       FROM exercises e
       JOIN workout_exercises we ON we.exercise_id = e.id
       JOIN workouts w ON w.id = we.workout_id
      WHERE e.user_id = $1
      GROUP BY e.id
      ORDER BY "lastPerformedOn" DESC, e.name`,
    [userId],
  );
  return rows;
}

// Scoped by user_id so one user can never read another's exercise.
async function findForUser(userId, exerciseId) {
  const { rows } = await pool.query(
    'SELECT id, name FROM exercises WHERE id = $1 AND user_id = $2',
    [exerciseId, userId],
  );
  return rows[0] || null;
}

// One point per workout date: the heaviest set that day, plus the reps at that weight.
async function progress(userId, exerciseId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (w.performed_on)
            w.performed_on AS "date",
            s.weight       AS "topWeight",
            s.reps         AS "reps",
            w.id           AS "workoutId"
       FROM sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = $1 AND we.exercise_id = $2
      ORDER BY w.performed_on, s.weight DESC, s.reps DESC`,
    [userId, exerciseId],
  );
  return rows;
}

module.exports = { findOrCreate, listForUser, findForUser, progress };
