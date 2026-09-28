// Every query here takes userId and filters on it. That is the core of
// backlog story #6: data isolation is enforced in the data layer, not just
// hidden in the UI.
const pool = require('../db/pool');
const exerciseRepository = require('./exerciseRepository');

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT w.id, w.performed_on AS "performedOn", w.note,
            COALESCE(
              json_agg(json_build_object('name', e.name, 'setCount',
                (SELECT count(*)::int FROM sets s WHERE s.workout_exercise_id = we.id))
                ORDER BY we.position)
              FILTER (WHERE we.id IS NOT NULL), '[]') AS exercises
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN exercises e ON e.id = we.exercise_id
      WHERE w.user_id = $1
      GROUP BY w.id
      ORDER BY w.performed_on DESC, w.id DESC`,
    [userId],
  );
  return rows;
}

async function findForUser(userId, workoutId, db = pool) {
  const { rows } = await db.query(
    `SELECT w.id, w.performed_on AS "performedOn", w.note,
            w.created_at AS "createdAt", w.updated_at AS "updatedAt"
       FROM workouts w WHERE w.id = $1 AND w.user_id = $2`,
    [workoutId, userId],
  );
  const workout = rows[0];
  if (!workout) return null;

  const { rows: exRows } = await db.query(
    `SELECT we.id AS "workoutExerciseId", e.id AS "exerciseId", e.name,
            COALESCE(json_agg(json_build_object('setNumber', s.set_number, 'reps', s.reps, 'weight', s.weight)
                     ORDER BY s.set_number) FILTER (WHERE s.id IS NOT NULL), '[]') AS sets
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
       LEFT JOIN sets s ON s.workout_exercise_id = we.id
      WHERE we.workout_id = $1
      GROUP BY we.id, e.id
      ORDER BY we.position`,
    [workoutId],
  );
  workout.exercises = exRows.map(({ workoutExerciseId, ...rest }) => ({
    ...rest,
    sets: rest.sets.map((s) => ({ ...s, weight: Number(s.weight) })),
  }));
  return workout;
}

async function insertExercises(client, userId, workoutId, exercises) {
  for (const [position, ex] of exercises.entries()) {
    const exercise = await exerciseRepository.findOrCreate(userId, ex.name, client);
    const { rows } = await client.query(
      'INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES ($1, $2, $3) RETURNING id',
      [workoutId, exercise.id, position],
    );
    for (const [i, set] of ex.sets.entries()) {
      await client.query(
        'INSERT INTO sets (workout_exercise_id, set_number, reps, weight) VALUES ($1, $2, $3, $4)',
        [rows[0].id, i + 1, set.reps, set.weight],
      );
    }
  }
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function create(userId, { performedOn, note, exercises }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO workouts (user_id, performed_on, note) VALUES ($1, $2, $3) RETURNING id',
      [userId, performedOn, note],
    );
    await insertExercises(client, userId, rows[0].id, exercises);
    return findForUser(userId, rows[0].id, client);
  });
}

// Replaces the workout's exercises and sets wholesale. Returns null if the
// workout doesn't exist or belongs to someone else.
async function update(userId, workoutId, { performedOn, note, exercises }) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE workouts SET performed_on = $3, note = $4, updated_at = now()
        WHERE id = $1 AND user_id = $2`,
      [workoutId, userId, performedOn, note],
    );
    if (rowCount === 0) return null;
    await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId]);
    await insertExercises(client, userId, workoutId, exercises);
    return findForUser(userId, workoutId, client);
  });
}

async function remove(userId, workoutId) {
  const { rowCount } = await pool.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [
    workoutId,
    userId,
  ]);
  return rowCount > 0;
}

module.exports = { listForUser, findForUser, create, update, remove };
