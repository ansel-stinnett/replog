-- 001: core tables for the Milestone 1 MVP.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Emails are compared case-insensitively; the index enforces uniqueness that way.
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

-- Exercises are per-user so each person's names ("Bench", "Bench Press") stay theirs.
CREATE TABLE exercises (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX exercises_user_name_idx ON exercises (user_id, lower(name));

CREATE TABLE workouts (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workouts_user_date_idx ON workouts (user_id, performed_on DESC);

-- Join table: one row per exercise performed in a workout, in display order.
CREATE TABLE workout_exercises (
  id          SERIAL PRIMARY KEY,
  workout_id  INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL CHECK (position >= 0)
);
CREATE INDEX workout_exercises_workout_idx ON workout_exercises (workout_id);
CREATE INDEX workout_exercises_exercise_idx ON workout_exercises (exercise_id);

CREATE TABLE sets (
  id                  SERIAL PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL CHECK (set_number >= 1),
  reps                INTEGER NOT NULL CHECK (reps >= 0),
  weight              NUMERIC(6, 2) NOT NULL CHECK (weight >= 0)
);
CREATE INDEX sets_workout_exercise_idx ON sets (workout_exercise_id);

-- Session store used by connect-pg-simple.
CREATE TABLE user_sessions (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX user_sessions_expire_idx ON user_sessions (expire);
