const router = require('express').Router({ mergeParams: true });
const express = require('express');
const db = require('../db/connection');
const authenticate = require('../middleware/auth');

function canAccessClaim(claim, user) {
  if (['processor', 'admin'].includes(user.role)) return true;
  if (claim.user_id === user.id) return true;
  if (user.role === 'manager' && claim.manager_id === user.id) return true;
  return false;
}

// Nested: /api/claims/:claimId/alerts
const nested = router;
nested.use(authenticate);

nested.get('/', async (req, res) => {
  const claim = await db('claims').where({ id: req.params.claimId }).first();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (!canAccessClaim(claim, req.user)) return res.status(403).json({ error: 'Forbidden' });

  const alerts = await db('alerts')
    .where({ claim_id: req.params.claimId })
    .orderBy('severity', 'asc')
    .orderBy('created_at', 'asc');
  res.json(alerts);
});

// Standalone: /api/alerts/:id/resolve
const standalone = express.Router();
standalone.use(authenticate);

standalone.put('/:id/resolve', async (req, res, next) => {
  try {
    const alert = await db('alerts').where({ id: req.params.id }).first();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const claim = await db('claims').where({ id: alert.claim_id }).first();
    if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const [updated] = await db('alerts')
      .where({ id: alert.id })
      .update({ resolved: true, resolved_at: db.fn.now() })
      .returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = { nested, standalone };
