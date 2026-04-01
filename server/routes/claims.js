const router = require('express').Router();
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const { transition, notify } = require('../services/workflowEngine');
const { runAlertEngine } = require('../services/alertEngine');
const emailService = require('../services/emailService');

router.use(authenticate);

// GET /api/claims — filtered by role, paginated
router.get('/', async (req, res) => {
  const { role, id: userId } = req.user;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const { search, status } = req.query;

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
        .orWhereIn('claims.status', ['submitted', 'manager_review']);
    });
  }
  // processor / admin see all

  if (status) query = query.where('claims.status', status);
  if (search) {
    query = query.where((q) => {
      q.whereILike('claims.title', `%${search}%`)
        .orWhereILike('owner.name', `%${search}%`);
    });
  }

  // Get total count before pagination
  const countQuery = query.clone().clearSelect().clearOrder().count('claims.id as total').first();
  const { total } = await countQuery;

  const claims = await query.offset((page - 1) * limit).limit(limit);

  // Attach alert counts and item totals
  const claimIds = claims.map((c) => c.id);
  if (claimIds.length === 0) {
    return res.json({ data: [], total: Number(total), page, pages: Math.ceil(Number(total) / limit) });
  }

  const alertCounts = await db('alerts')
    .whereIn('claim_id', claimIds)
    .where({ resolved: false })
    .groupBy('claim_id')
    .select('claim_id', db.raw('count(*) as count'));

  const itemTotals = await db('claim_items')
    .whereIn('claim_id', claimIds)
    .groupBy('claim_id')
    .select('claim_id', db.raw('SUM(COALESCE(amount, reimbursement_amount, 0)) as total_amount'));
  const totalMap = Object.fromEntries(itemTotals.map((t) => [t.claim_id, parseFloat(t.total_amount || 0)]));

  const countMap = Object.fromEntries(alertCounts.map((a) => [a.claim_id, Number(a.count)]));
  const result = claims.map((c) => ({
    ...c,
    alert_count: countMap[c.id] || 0,
    total_amount: totalMap[c.id] || 0,
  }));

  res.json({ data: result, total: Number(total), page, pages: Math.ceil(Number(total) / limit) });
});

// POST /api/claims
router.post('/', async (req, res) => {
  const { title, template_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 200) return res.status(400).json({ error: 'title too long (max 200 characters)' });

  const [claim] = await db('claims')
    .insert({ user_id: req.user.id, title, status: 'draft' })
    .returning('*');

  if (template_id) {
    const template = await db('claim_templates')
      .where({ id: template_id, user_id: req.user.id })
      .first();
    if (template) {
      const items = Array.isArray(template.items)
        ? template.items
        : JSON.parse(template.items || '[]');
      const today = new Date().toISOString().slice(0, 10);
      for (const item of items) {
        const { id, claim_id, transaction_date, reimbursement_amount, receipts, created_at, updated_at, ...fields } = item;
        if (!['expense', 'mileage'].includes(fields.type)) continue;
        if (fields.amount !== undefined) fields.amount = Math.max(0, Number(fields.amount) || 0);
        if (fields.vat !== undefined) fields.vat = Math.max(0, Number(fields.vat) || 0);
        if (fields.distance !== undefined) fields.distance = fields.distance ? Math.max(0, Number(fields.distance) || 0) : null;
        if (fields.supplier && fields.supplier.length > 200) fields.supplier = fields.supplier.slice(0, 200);
        if (fields.business_purpose && fields.business_purpose.length > 1000) fields.business_purpose = fields.business_purpose.slice(0, 1000);
        await db('claim_items').insert({ ...fields, claim_id: claim.id, transaction_date: today });
      }
    }
  }

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
router.put('/:id', async (req, res, next) => {
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (claim.status !== 'draft') return res.status(422).json({ error: 'Only draft claims can be edited' });

    const { title } = req.body;
    if (title && title.length > 200) return res.status(400).json({ error: 'title too long (max 200 characters)' });
    const [updated] = await db('claims').where({ id: req.params.id }).update({ title, updated_at: db.fn.now() }).returning('*');
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/claims/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (claim.status !== 'draft') return res.status(422).json({ error: 'Only draft claims can be deleted' });

    await db('claims').where({ id: req.params.id }).delete();
    res.status(204).end();
  } catch (err) { next(err); }
});

// POST /api/claims/:id/submit
router.post('/:id/submit', async (req, res, next) => {
  try {
  const claim = await db('claims').where({ id: req.params.id }).first();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (claim.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (claim.status !== 'draft') return res.status(422).json({ error: 'Only draft claims can be submitted' });

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
    }).catch(() => {});
  }

  res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/claims/:id/approve  (manager)
router.post('/:id/approve', async (req, res) => {
  if (!['manager', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { comment } = req.body;
  try {
    const claim = await db('claims').where({ id: req.params.id }).first();
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    if (req.user.role === 'manager' && claim.manager_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

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
      }).catch(() => {});
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
    if (req.user.role === 'manager' && claim.manager_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

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
      }).catch(() => {});
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
      }).catch(() => {});
    }
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Audit reject failed' });
  }
});

module.exports = router;
