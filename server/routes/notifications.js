const router = require('express').Router();
const db = require('../db/connection');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res) => {
  const notifications = await db('notifications')
    .where({ user_id: req.user.id })
    .orderBy('created_at', 'desc')
    .limit(50);
  res.json(notifications);
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  const n = await db('notifications').where({ id: req.params.id, user_id: req.user.id }).first();
  if (!n) return res.status(404).json({ error: 'Not found' });
  const [updated] = await db('notifications').where({ id: n.id }).update({ read: true }).returning('*');
  res.json(updated);
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  await db('notifications').where({ user_id: req.user.id, read: false }).update({ read: true });
  res.json({ ok: true });
});

module.exports = router;
