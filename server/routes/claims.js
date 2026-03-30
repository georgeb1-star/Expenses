const router = require('express').Router();
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const { transition, notify } = require('../services/workflowEngine');
const { runAlertEngine } = require('../services/alertEngine');
const emailService = require('../services/emailService');

router.use(authenticate);

// GET /api/claims — filtered by role
router.get('/', async (req, res) => {
  const { role, id: userId } = req.user;
  let query = db('claims')
    .join('users as owner', 'claims.user_id', 'owner.id')
    .select(
      'claims.*',
      'owner.name as owner_name',
      'owner.email as owner_email',
      'owner.department as owner_department'
    )
    .orderBy('claims.updated_at', 'desc');

  if (role === 'employee') query = query.where('claims.user_id', userId);
  else if (role === 'manager') {
    const team = await db('users').where({ manager_id: userId }).pluck('id');
    query = query.where((q) => {
      q.where('claims.manager_id', userId)
        .orWhereIn('claims.user_id', [...team, userId])
        // Unassigned submitted claims are visible to all managers so nothing gets stuck
        .orWhereIn('claims.status', ['submitted', 'manager_review']);
    });
  }
  // processor / admin see all

  const claims = await query;

  // Attach alert counts
  const claimIds = claims.map((c) => c.id);
  const alertCounts = await db('alerts')
    .whereIn('claim_id', claimIds)
    .where({ resolved: false })
    .groupBy('claim_id')
    .select('claim_id', db.raw('count(*) as count'));

  const countMap = Object.fromEntries(alertCounts.map((a) => [a.claim_id, Number(a.count)]));
  const result = claims.map((c) => ({ ...c, alert_count: countMap[c.id] || 0 }));

  res.json(result);
});

// POST /api/claims
router.post('/', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const [claim] = await db('claims')
    .insert({ user_id: req.user.id, title, status: 'draft' })
    .returning('*');
  res.status(201).json(claim);
});

// GET /api/claims/:id
router.get('/:id', async (req, res) => {
  const claim = await db('claims')
    .join('users as owner', 'claims.user_id', 'owner.id')
    .leftJoin('users as mgr', 'claims.manager_id', 'mgr.id')
    .leftJoin('batches', 'claims.batch_id', 'batches.id')
    .where('claims.id', req.params.id)
    .select(
      'claims.*',
      'owner.name as owner_name',
      'owner.email as owner_email',
      'owner.department as owner_department',
      'owner.employee_id as owner_employee_id',
      'mgr.name as manager_name',
      'batches.name as batch_name'
    )
    .first();

  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const { role, id: userId } = req.user;
  if (role === 'employee' && claim.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const items = await db('claim_items').where({ claim_id: claim.id });

  // Attach receipt metadata (no binary data) to each item
  const receipts = await db('receipts')
    .whereIn('claim_item_id', items.map((i) => i.id))
    .select('id', 'claim_item_id', 'filename', 'mime_type', 'uploaded_at');
  const receiptsByItem = {};
  receipts.forEach((r) => {
    if (!receiptsByItem[r.claim_item_id]) receiptsByItem[r.claim_item_id] = [];
    receiptsByItem[r.claim_item_id].push(r);
  });
  const itemsWithReceipts = items.map((i) => ({ ...i, receipts: receiptsByItem[i.id] || [] }));

  const auditLog = await db('audit_logs')
    .join('users', 'audit_logs.user_id', 'users.id')
    .where('audit_logs.claim_id', claim.id)
    .select('audit_logs.*', 'users.name as user_name')
    .orderBy('audit_logs.created_at', 'asc');

  res.set('Cache-Control', 'no-store');
  res.json({ ...claim, items: itemsWithReceipts, audit_log: auditLog });
});

// PUT /api/claims/:id
router.put('/:id', async (req, res) => {
  const claim = await db('claims').where({ id: req.params.id }).first();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (claim.status !== 'draft') return res.status(422).json({ error: 'Only draft claims can be edited' });

  const { title } = req.body;
  const [updated] = await db('claims').where({ id: req.params.id }).update({ title, updated_at: db.fn.now() }).returning('*');
  res.json(updated);
});

// DELETE /api/claims/:id
router.delete('/:id', async (req, res) => {
  const claim = await db('claims').where({ id: req.params.id }).first();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (claim.status !== 'draft') return res.status(422).json({ error: 'Only draft claims can be deleted' });

  await db('claims').where({ id: req.params.id }).delete();
  res.status(204).end();
});

// POST /api/claims/:id/submit
router.post('/:id/submit', async (req, res) => {
  const claim = await db('claims').where({ id: req.params.id }).first();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const items = await db('claim_items').where({ claim_id: claim.id });
  if (!items.length) return res.status(422).json({ error: 'Cannot submit a claim with no items' });

  // Run alert engine before submission
  await runAlertEngine(claim.id, req.user.id);

  // Check for blocking errors
  const errors = await db('alerts').where({ claim_id: claim.id, severity: 'error', resolved: false });
  if (errors.length) {
    return res.status(422).json({
      error: 'Resolve all errors before submitting',
      alerts: errors,
    });
  }

  // Determine manager
  const owner = await db('users').where({ id: req.user.id }).first();
  const managerId = owner.manager_id;
  if (!managerId) {
    return res.status(422).json({ error: 'Your account has no manager assigned. Ask an admin to set your manager before submitting.' });
  }

  await db('claims').where({ id: claim.id }).update({ manager_id: managerId, updated_at: db.fn.now() });

  // Transition directly to manager_review, recording the submission in the audit log
  await db('claims').where({ id: claim.id }).update({
    status: 'manager_review',
    submitted_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
  await db('audit_logs').insert({
    claim_id: claim.id,
    user_id: req.user.id,
    action: 'submit',
    details: JSON.stringify({ from: 'draft', to: 'manager_review' }),
  });

  const updated = await db('claims').where({ id: claim.id }).first();

  await notify([managerId], claim.id, `New claim submitted by ${req.user.name}: "${claim.title}"`);

  const manager = await db('users').where({ id: managerId }).first();
  if (manager) {
    emailService.claimSubmitted({
      managerEmail: manager.email,
      managerName: manager.name,
      employeeName: req.user.name,
      claimTitle: claim.title,
      claimId: claim.id,
    });
  }

  res.json(updated);
});

// POST /api/claims/:id/approve  (manager)
router.post('/:id/approve', async (req, res) => {
  if (!['manager', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { comment } = req.body;
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const updated = await transition(claim.id, 'approve', req.user.id, { comment });
    if (comment) await db('comments').insert({ claim_id: claim.id, user_id: req.user.id, message: comment });
    await notify([claim.user_id], claim.id, `Your claim "${claim.title}" has been approved by ${req.user.name}`);

    const employee = await db('users').where({ id: claim.user_id }).first();
    if (employee) {
      emailService.claimApproved({
        employeeEmail: employee.email,
        employeeName: employee.name,
        claimTitle: claim.title,
        claimId: claim.id,
        managerName: req.user.name,
      });
    }
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Approve failed' });
  }
});

// POST /api/claims/:id/reject  (manager)
router.post('/:id/reject', async (req, res) => {
  if (!['manager', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'A comment is required when rejecting' });
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const updated = await transition(claim.id, 'reject', req.user.id, { comment });
    await db('comments').insert({ claim_id: claim.id, user_id: req.user.id, message: comment });
    await notify([claim.user_id], claim.id, `Your claim "${claim.title}" was sent back by ${req.user.name}: ${comment}`);

    const employee = await db('users').where({ id: claim.user_id }).first();
    if (employee) {
      emailService.claimRejected({
        employeeEmail: employee.email,
        employeeName: employee.name,
        claimTitle: claim.title,
        claimId: claim.id,
        managerName: req.user.name,
        comment,
      });
    }
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Reject failed' });
  }
});

// POST /api/claims/:id/start-audit  (processor)
router.post('/:id/start-audit', async (req, res) => {
  if (!['processor', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const updated = await transition(claim.id, 'audit', req.user.id, {});
    await notify([claim.user_id], claim.id, `Your claim "${claim.title}" has been sent to finance audit`);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Start audit failed' });
  }
});

// POST /api/claims/:id/audit-approve  (processor)
router.post('/:id/audit-approve', async (req, res) => {
  if (!['processor', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { comment } = req.body;
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const updated = await transition(claim.id, 'audit_approve', req.user.id, { comment });
    if (comment) await db('comments').insert({ claim_id: claim.id, user_id: req.user.id, message: comment });
    await notify([claim.user_id], claim.id, `Your claim "${claim.title}" passed audit and is being processed`);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Audit approve failed' });
  }
});

// POST /api/claims/:id/audit-reject  (processor)
router.post('/:id/audit-reject', async (req, res) => {
  if (!['processor', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'A comment is required when rejecting audit' });
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    await db('claims').where({ id: claim.id }).update({ batch_id: null });
    const updated = await transition(claim.id, 'audit_reject', req.user.id, { comment });
    await db('comments').insert({ claim_id: claim.id, user_id: req.user.id, message: comment });
    await notify([claim.user_id, claim.manager_id], claim.id, `Claim "${claim.title}" failed audit: ${comment}`);

    const [employee, manager] = await Promise.all([
      db('users').where({ id: claim.user_id }).first(),
      claim.manager_id ? db('users').where({ id: claim.manager_id }).first() : null,
    ]);
    if (employee && manager) {
      emailService.auditRejected({
        employeeEmail: employee.email,
        employeeName: employee.name,
        managerEmail: manager.email,
        managerName: manager.name,
        claimTitle: claim.title,
        claimId: claim.id,
        comment,
      });
    }
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Audit reject failed' });
  }
});

module.exports = router;
