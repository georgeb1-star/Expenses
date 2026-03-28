const router = require('express').Router();
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const allow = require('../middleware/rbac');
const { transition, notify } = require('../services/workflowEngine');
const { generateBatchCsv } = require('../services/exportService');

router.use(authenticate);

// GET /api/batches
router.get('/', allow('processor', 'admin'), async (req, res) => {
  const batches = await db('batches')
    .join('users', 'batches.processor_id', 'users.id')
    .select('batches.*', 'users.name as processor_name')
    .orderBy('batches.created_at', 'desc');

  const batchIds = batches.map((b) => b.id);
  const counts = await db('claims')
    .whereIn('batch_id', batchIds)
    .groupBy('batch_id')
    .select('batch_id', db.raw('count(*) as claim_count'));

  const countMap = Object.fromEntries(counts.map((c) => [c.batch_id, Number(c.claim_count)]));
  res.json(batches.map((b) => ({ ...b, claim_count: countMap[b.id] || 0 })));
});

// POST /api/batches — create batch from approved claims
router.post('/', allow('processor', 'admin'), async (req, res) => {
  const { name, claim_ids } = req.body;
  if (!name || !claim_ids?.length) {
    return res.status(400).json({ error: 'name and claim_ids are required' });
  }

  // Verify all claims are in 'approved' status
  const claims = await db('claims').whereIn('id', claim_ids);
  const invalid = claims.filter((c) => c.status !== 'approved');
  if (invalid.length) {
    return res.status(422).json({ error: 'All claims must be in approved status', invalid: invalid.map((c) => c.id) });
  }

  const [batch] = await db('batches')
    .insert({ name, processor_id: req.user.id })
    .returning('*');

  // Assign batch and move to audit
  await db('claims').whereIn('id', claim_ids).update({ batch_id: batch.id, updated_at: db.fn.now() });

  for (const claim of claims) {
    await transition(claim.id, 'audit', req.user.id, { batch_id: batch.id });
    await notify([claim.user_id], claim.id, `Your claim "${claim.title}" has been added to batch "${name}" for audit`);
  }

  res.status(201).json(batch);
});

// GET /api/batches/:id/export — download CSV
router.get('/:id/export', allow('processor', 'admin'), async (req, res) => {
  const batch = await db('batches').where({ id: req.params.id }).first();
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const csv = await generateBatchCsv(batch.id);

  // Mark batch as exported
  await db('batches').where({ id: batch.id }).update({ exported_at: db.fn.now() });

  // Move all processing claims to exported
  const claims = await db('claims').where({ batch_id: batch.id, status: 'processing' });
  for (const claim of claims) {
    await transition(claim.id, 'export', req.user.id);
    await notify([claim.user_id], claim.id, `Your claim "${claim.title}" has been exported to finance`);
  }

  const filename = `batch-${batch.name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// GET /api/batches/:id — batch detail with claims
router.get('/:id', allow('processor', 'admin'), async (req, res) => {
  const batch = await db('batches').where({ id: req.params.id }).first();
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const claims = await db('claims')
    .join('users', 'claims.user_id', 'users.id')
    .where('claims.batch_id', batch.id)
    .select('claims.*', 'users.name as owner_name', 'users.department as owner_department');

  res.json({ ...batch, claims });
});

module.exports = router;
