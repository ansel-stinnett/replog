const express = require('express');
const workouts = require('../repositories/workoutRepository');
const { validateWorkout, parseId } = require('../validation');

const router = express.Router();
const NOT_FOUND = { error: 'Workout not found.' };

router.get('/', async (req, res) => {
  res.json({ workouts: await workouts.listForUser(req.userId) });
});

router.post('/', async (req, res) => {
  const { value, errors } = validateWorkout(req.body);
  if (errors) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
  const workout = await workouts.create(req.userId, value);
  return res.status(201).location(`/api/workouts/${workout.id}`).json({ workout });
});

// Another user's workout returns 404, the same as one that doesn't exist,
// so IDs can't be probed to learn what exists.
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const workout = id && (await workouts.findForUser(req.userId, id));
  if (!workout) return res.status(404).json(NOT_FOUND);
  return res.json({ workout });
});

router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json(NOT_FOUND);
  const { value, errors } = validateWorkout(req.body);
  if (errors) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
  const workout = await workouts.update(req.userId, id, value);
  if (!workout) return res.status(404).json(NOT_FOUND);
  return res.json({ workout });
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const deleted = id && (await workouts.remove(req.userId, id));
  if (!deleted) return res.status(404).json(NOT_FOUND);
  return res.status(204).end();
});

module.exports = router;
