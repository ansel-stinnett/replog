// Loads the two demo accounts from the README:
//   demo@replog.test  / demo1234  -> ~8 weeks of history (3 sessions a week)
//   empty@replog.test / demo1234  -> no data, for first-run testing
// Safe to run repeatedly: it deletes those two accounts first.
const bcrypt = require('bcryptjs');
const pool = require('./pool');
const workouts = require('../repositories/workoutRepository');

const PASSWORD = 'demo1234';
const WEEKS = 8;

// Push/pull/legs split with starting weights (lb) and weekly increments.
const PLAN = [
  { day: 1, note: 'Push day', lifts: [['Bench Press', 165, 5, 5], ['Overhead Press', 95, 2.5, 8], ['Dip', 0, 0, 10]] },
  { day: 3, note: 'Pull day', lifts: [['Barbell Row', 135, 5, 8], ['Pull-up', 0, 0, 8], ['Barbell Curl', 55, 2.5, 10]] },
  { day: 5, note: 'Leg day', lifts: [['Squat', 205, 10, 5], ['Romanian Deadlift', 155, 5, 8], ['Leg Press', 270, 10, 10]] },
];

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function upsertUser(email, displayName) {
  await pool.query('DELETE FROM users WHERE lower(email) = lower($1)', [email]);
  const hash = await bcrypt.hash(PASSWORD, 12);
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id',
    [email, hash, displayName],
  );
  return rows[0].id;
}

async function seed() {
  const demoId = await upsertUser('demo@replog.test', 'Marcus');
  await upsertUser('empty@replog.test', null);

  let count = 0;
  for (let week = 0; week < WEEKS; week += 1) {
    for (const session of PLAN) {
      // Oldest week first; the most recent session lands within the last week.
      const daysAgo = (WEEKS - 1 - week) * 7 + (7 - session.day);
      const exercises = session.lifts.map(([name, start, step, reps]) => {
        const weight = start + step * week;
        // Last set drops a rep, like a real top-end set.
        return { name, sets: [{ reps, weight }, { reps, weight }, { reps: Math.max(reps - 1, 1), weight }] };
      });
      // Skip one session to make the history look lived-in.
      if (week === 4 && session.day === 3) continue;
      await workouts.create(demoId, {
        performedOn: isoDaysAgo(daysAgo),
        note: week === WEEKS - 1 && session.day === 1 ? 'New bench PR, felt easy' : session.note,
        exercises,
      });
      count += 1;
    }
  }
  console.log(`seeded demo@replog.test with ${count} workouts, and empty@replog.test`);
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seed;
