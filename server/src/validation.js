// Pure input validation. Each function returns { value } on success or
// { errors } (a field -> message map) on failure, so handlers stay small and
// these rules can be unit-tested without a database.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WEIGHT = 9999.99; // NUMERIC(6,2)
const MAX_REPS = 1000;

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function validateCredentials(body = {}, { requireDisplayName = false } = {}) {
  const errors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';

  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (password.length > 128) errors.password = 'Password must be 128 characters or fewer.';
  if (requireDisplayName && displayName.length > 50) {
    errors.displayName = 'Name must be 50 characters or fewer.';
  }

  if (Object.keys(errors).length) return { errors };
  return { value: { email, password, displayName: displayName || null } };
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

// A workout must have a valid date (defaults to today) and at least one
// exercise with at least one set. This is the "empty submission is rejected"
// rule from backlog story #3.
function validateWorkout(body = {}) {
  const errors = {};
  const performedOn = body.performedOn ? String(body.performedOn) : todayISO();
  if (!isRealDate(performedOn)) errors.performedOn = 'Date must be a real date in YYYY-MM-DD format.';

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > 1000) errors.note = 'Note must be 1000 characters or fewer.';

  const rawExercises = Array.isArray(body.exercises) ? body.exercises : [];
  if (rawExercises.length === 0) errors.exercises = 'Add at least one exercise.';
  if (rawExercises.length > 30) errors.exercises = 'A workout can have at most 30 exercises.';

  const exercises = rawExercises.map((ex, i) => {
    const name = typeof ex?.name === 'string' ? ex.name.trim() : '';
    if (!name) errors[`exercises[${i}].name`] = 'Exercise name is required.';
    else if (name.length > 80) errors[`exercises[${i}].name`] = 'Exercise name must be 80 characters or fewer.';

    const rawSets = Array.isArray(ex?.sets) ? ex.sets : [];
    if (rawSets.length === 0) errors[`exercises[${i}].sets`] = 'Add at least one set.';
    if (rawSets.length > 50) errors[`exercises[${i}].sets`] = 'An exercise can have at most 50 sets.';

    const sets = rawSets.map((s, j) => {
      const reps = toNumber(s?.reps);
      const weight = toNumber(s?.weight);
      if (!Number.isInteger(reps) || reps < 0 || reps > MAX_REPS) {
        errors[`exercises[${i}].sets[${j}].reps`] = 'Reps must be a whole number from 0 to 1000.';
      }
      if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT) {
        errors[`exercises[${i}].sets[${j}].weight`] = 'Weight must be a number from 0 to 9999.99.';
      }
      return { reps, weight: Math.round(weight * 100) / 100 };
    });
    return { name, sets };
  });

  if (Object.keys(errors).length) return { errors };
  return { value: { performedOn, note: note || null, exercises } };
}

// Route params arrive as strings; anything that isn't a positive integer is
// treated as "not found" rather than reaching the database.
function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : null;
}

module.exports = { validateCredentials, validateWorkout, parseId, isRealDate, todayISO };
