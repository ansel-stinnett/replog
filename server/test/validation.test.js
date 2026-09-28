const { validateCredentials, validateWorkout, parseId, isRealDate } = require('../src/validation');

describe('validateCredentials', () => {
  test('normalizes email and accepts a valid password', () => {
    const { value } = validateCredentials({ email: '  Demo@RepLog.Test ', password: 'longenough' });
    expect(value.email).toBe('demo@replog.test');
  });

  test('rejects bad email and short password', () => {
    const { errors } = validateCredentials({ email: 'nope', password: 'short' });
    expect(errors).toHaveProperty('email');
    expect(errors).toHaveProperty('password');
  });
});

describe('validateWorkout', () => {
  const ok = { exercises: [{ name: 'Squat', sets: [{ reps: 5, weight: 225 }] }] };

  test('defaults the date to today', () => {
    const { value } = validateWorkout(ok);
    expect(isRealDate(value.performedOn)).toBe(true);
  });

  test('rejects an empty submission', () => {
    const { errors } = validateWorkout({});
    expect(errors.exercises).toBeDefined();
  });

  test('rejects negative reps and weight', () => {
    const { errors } = validateWorkout({
      exercises: [{ name: 'Squat', sets: [{ reps: -1, weight: -5 }] }],
    });
    expect(errors['exercises[0].sets[0].reps']).toBeDefined();
    expect(errors['exercises[0].sets[0].weight']).toBeDefined();
  });

  test('rejects non-integer reps and impossible dates', () => {
    const { errors } = validateWorkout({ ...ok, performedOn: '2026-02-30', exercises: [{ name: 'Squat', sets: [{ reps: 2.5, weight: 100 }] }] });
    expect(errors.performedOn).toBeDefined();
    expect(errors['exercises[0].sets[0].reps']).toBeDefined();
  });

  test('accepts numeric strings from form inputs', () => {
    const { value } = validateWorkout({ exercises: [{ name: 'Curl', sets: [{ reps: '10', weight: '27.5' }] }] });
    expect(value.exercises[0].sets[0]).toEqual({ reps: 10, weight: 27.5 });
  });

  test('requires at least one set per exercise', () => {
    const { errors } = validateWorkout({ exercises: [{ name: 'Squat', sets: [] }] });
    expect(errors['exercises[0].sets']).toBeDefined();
  });
});

describe('parseId', () => {
  test.each([['12', 12], ['0', null], ['-3', null], ['abc', null], ['1.5', null], ['99999999999', null]])(
    'parseId(%s) -> %s',
    (input, expected) => expect(parseId(input)).toBe(expected),
  );
});
