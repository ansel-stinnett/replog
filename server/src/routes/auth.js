const express = require('express');
const bcrypt = require('bcryptjs');
const users = require('../repositories/userRepository');
const requireAuth = require('../middleware/requireAuth');
const { validateCredentials } = require('../validation');

const router = express.Router();
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;
// Compared against when the email doesn't exist, so a login for an unknown
// email takes about as long as a wrong password (no user-enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

// Regenerating the session ID on login prevents session fixation.
function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      return req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

router.post('/register', async (req, res) => {
  const { value, errors } = validateCredentials(req.body, { requireDisplayName: true });
  if (errors) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });

  const passwordHash = await bcrypt.hash(value.password, BCRYPT_ROUNDS);
  const user = await users.create({ ...value, passwordHash });
  if (!user) {
    return res.status(409).json({
      error: 'An account with that email already exists.',
      fields: { email: 'An account with that email already exists.' },
    });
  }
  await startSession(req, user.id);
  return res.status(201).json({ user });
});

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const found = email ? await users.findByEmail(email) : null;
  const ok = await bcrypt.compare(password, found ? found.passwordHash : DUMMY_HASH);

  if (!found || !ok) {
    // Same message either way: don't reveal which part was wrong.
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  await startSession(req, found.id);
  const { passwordHash, ...user } = found;
  return res.json({ user });
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('replog.sid');
    return res.status(204).end();
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await users.findById(req.userId);
  if (!user) {
    // Account was deleted while the session lived on.
    return req.session.destroy(() => res.status(401).json({ error: 'You need to log in first.' }));
  }
  const stats = await users.stats(req.userId);
  return res.json({ user, stats });
});

router.patch('/me', requireAuth, async (req, res) => {
  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
  if (displayName.length > 50) {
    return res.status(400).json({
      error: 'Check the highlighted fields.',
      fields: { displayName: 'Name must be 50 characters or fewer.' },
    });
  }
  const user = await users.updateDisplayName(req.userId, displayName || null);
  return res.json({ user });
});

module.exports = router;
