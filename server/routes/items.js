const router = require('express').Router({ mergeParams: true });
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const { calculateReimbursement } = require('../services/mileageCalc');

router.use(authenticate);

async function getClaim(claimId) {
  return db('claims').where({ id: claimId }).first();
}

// POST /api/claims/:claimId/items
router.post('/', async (req, res, next) => {
  try {
    const claim = await getClaim(req.params.claimId);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (claim.status !== 'draft') return res.status(422).json({ error: 'Can only add items to draft claims' });

    const {
      type, expense_type, supplier, transaction_date, amount, vat, currency = 'GBP',
      payment_type, business_purpose, department, project, billable = false,
      from_location, to_location, vehicle_type, distance, passengers,
    } = req.body;

    if (!type || !transaction_date) {
      return res.status(400).json({ error: 'type and transaction_date are required' });
    }

    let reimbursement_amount = null;
    if (type === 'mileage') {
      if (!distance) return res.status(400).json({ error: 'distance is required for mileage items' });
      const owner = await db('users').where({ id: req.user.id }).first();
      reimbursement_amount = await calculateReimbursement(owner.id, distance, transaction_date);
    }

    const [item] = await db('claim_items').insert({
      claim_id: claim.id, type, expense_type, supplier, transaction_date,
      amount: amount || 0, vat: vat || 0, currency, payment_type, business_purpose,
      department, project, billable,
      from_location, to_location, vehicle_type,
      distance: distance || null,
      passengers: passengers || null,
      reimbursement_amount,
    }).returning('*');

    await db('claims').where({ id: claim.id }).update({ updated_at: db.fn.now() });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// PUT /api/claims/:claimId/items/:itemId
router.put('/:itemId', async (req, res, next) => {
  try {
    const claim = await getClaim(req.params.claimId);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (claim.status !== 'draft') return res.status(422).json({ error: 'Can only edit items on draft claims' });

    const item = await db('claim_items').where({ id: req.params.itemId, claim_id: claim.id }).first();
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.claim_id;

    if (updates.type === 'mileage' && updates.distance) {
      updates.reimbursement_amount = await calculateReimbursement(
        req.user.id, updates.distance, updates.transaction_date || item.transaction_date, item.id
      );
    }

    const [updated] = await db('claim_items')
      .where({ id: item.id })
      .update({ ...updates, updated_at: db.fn.now() })
      .returning('*');

    await db('claims').where({ id: claim.id }).update({ updated_at: db.fn.now() });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/claims/:claimId/items/:itemId
router.delete('/:itemId', async (req, res, next) => {
  try {
    const claim = await getClaim(req.params.claimId);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (claim.status !== 'draft') return res.status(422).json({ error: 'Can only delete items from draft claims' });

    const deleted = await db('claim_items')
      .where({ id: req.params.itemId, claim_id: claim.id })
      .delete();

    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
