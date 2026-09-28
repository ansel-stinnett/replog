const express = require('express');
const exercises = require('../repositories/exerciseRepository');
const { parseId } = require('../validation');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json({ exercises: await exercises.listForUser(req.userId) });
});

router.get('/:id/progress', async (req, res) => {
  const id = parseId(req.params.id);
  const exercise = id && (await exercises.findForUser(req.userId, id));
  if (!exercise) return res.status(404).json({ error: 'Exercise not found.' });
  const points = await exercises.progress(req.userId, id);
  return res.json({ exercise, points });
});

module.exports = router;
