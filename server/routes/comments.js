const router = require('express').Router({ mergeParams: true });
const db = require('../db/connection');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/claims/:claimId/comments
router.get('/', async (req, res) => {
  const comments = await db('comments')
    .join('users', 'comments.user_id', 'users.id')
    .where('comments.claim_id', req.params.claimId)
    .select('comments.*', 'users.name as user_name', 'users.role as user_role')
    .orderBy('comments.created_at', 'asc');
  res.json(comments);
});

// POST /api/claims/:claimId/comments
router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const claim = await db('claims').where({ id: req.params.claimId }).first();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const [comment] = await db('comments')
    .insert({ claim_id: claim.id, user_id: req.user.id, message })
    .returning('*');

  const withUser = { ...comment, user_name: req.user.name, user_role: req.user.role };
  res.status(201).json(withUser);
});

module.exports = router;
