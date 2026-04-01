const router = require('express').Router();
const db = require('../db/connection');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/templates — list current user's templates
router.get('/', async (req, res, next) => {
  try {
    const templates = await db('claim_templates')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc');
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

// POST /api/templates — create template
router.post('/', async (req, res, next) => {
  try {
    const { name, items } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items must be a non-empty array' });

    // Strip fields that should not be stored in a template
    const templateItems = items.map((item) => {
      const { id, claim_id, transaction_date, reimbursement_amount, receipts, ...rest } = item;
      return rest;
    });

    const [template] = await db('claim_templates')
      .insert({ user_id: req.user.id, name: name.trim().slice(0, 80), items: JSON.stringify(templateItems) })
      .returning('*');

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/templates/:id — delete (owner only)
router.delete('/:id', async (req, res, next) => {
  try {
    const template = await db('claim_templates').where({ id: req.params.id }).first();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await db('claim_templates').where({ id: req.params.id }).delete();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
