const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const allow = require('../middleware/rbac');
const emailService = require('../services/emailService');

router.use(authenticate, allow('admin'));

const VALID_ROLES = ['employee', 'manager', 'processor', 'admin'];

// GET /api/users
router.get('/', async (req, res) => {
  const { search, role, department } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);

  let q = db('users')
    .leftJoin('users as mgr', 'users.manager_id', 'mgr.id')
    .select(
      'users.id', 'users.name', 'users.email', 'users.role', 'users.pending_role',
      'users.department', 'users.employee_id', 'users.manager_id',
      'users.created_at', 'mgr.name as manager_name'
    )
    .orderByRaw('users.pending_role IS NULL ASC, users.name ASC');

  if (search) {
    q = q.where((b) => {
      b.whereILike('users.name', `%${search}%`)
       .orWhereILike('users.email', `%${search}%`);
    });
  }
  if (role) q = q.where('users.role', role);
  if (department) q = q.whereILike('users.department', `%${department}%`);

  const [{ total }] = await q.clone().clearSelect().clearOrder().count('users.id as total');
  const users = await q.offset((page - 1) * limit).limit(limit);
  res.json({ data: users, total: Number(total), page, pages: Math.ceil(Number(total) / limit) });
});

// POST /api/users
router.post('/', async (req, res) => {
  const { name, email, password, role, department, employee_id, manager_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'name too long' });
  if (email.length > 200) return res.status(400).json({ error: 'email too long' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const existing = await db('users').where({ email }).first();
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  if (manager_id) {
    const mgr = await db('users').where({ id: manager_id }).whereIn('role', ['manager', 'admin']).first();
    if (!mgr) return res.status(400).json({ error: 'Invalid manager selected' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users')
    .insert({ name, email, password_hash, role, department, employee_id, manager_id: manager_id || null })
    .returning(['id', 'name', 'email', 'role', 'department', 'employee_id', 'manager_id', 'created_at']);

  res.status(201).json(user);
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot edit your own account' });
  }

  const target = await db('users').where({ id: req.params.id }).first();
  if (!target) return res.status(404).json({ error: 'User not found' });

  const { name, email, role, department, employee_id, manager_id } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (name.length > 100) return res.status(400).json({ error: 'name too long' });
    updates.name = name;
  }
  if (email !== undefined) {
    if (email.length > 200) return res.status(400).json({ error: 'email too long' });
    const clash = await db('users').where({ email }).whereNot({ id: req.params.id }).first();
    if (clash) return res.status(409).json({ error: 'Email already in use' });
    updates.email = email;
  }
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    updates.role = role;
  }
  if (department !== undefined) updates.department = department;
  if (employee_id !== undefined) updates.employee_id = employee_id;
  if (manager_id !== undefined) {
    if (manager_id) {
      const mgr = await db('users').where({ id: manager_id }).whereIn('role', ['manager', 'admin']).first();
      if (!mgr) return res.status(400).json({ error: 'Invalid manager selected' });
    }
    updates.manager_id = manager_id || null;
  }

  const [user] = await db('users')
    .where({ id: req.params.id })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning(['id', 'name', 'email', 'role', 'department', 'employee_id', 'manager_id', 'created_at']);

  res.json(user);
});

// POST /api/users/:id/approve-role
router.post('/:id/approve-role', async (req, res) => {
  const target = await db('users').where({ id: req.params.id }).first();
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (!target.pending_role) return res.status(422).json({ error: 'No pending role request' });

  const [user] = await db('users')
    .where({ id: req.params.id })
    .update({ role: target.pending_role, pending_role: null, updated_at: db.fn.now() })
    .returning(['id', 'name', 'email', 'role', 'pending_role']);

  await db('notifications').insert({
    user_id: target.id,
    message: `Your ${target.pending_role} role request has been approved. Please log out and log back in to activate your new access.`,
  });

  await emailService.roleApproved({ email: target.email, name: target.name, role: target.pending_role }).catch(() => {});

  res.json(user);
});

// POST /api/users/:id/deny-role
router.post('/:id/deny-role', async (req, res) => {
  const target = await db('users').where({ id: req.params.id }).first();
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (!target.pending_role) return res.status(422).json({ error: 'No pending role request' });

  const deniedRole = target.pending_role;
  const [user] = await db('users')
    .where({ id: req.params.id })
    .update({ pending_role: null, updated_at: db.fn.now() })
    .returning(['id', 'name', 'email', 'role', 'pending_role']);

  await db('notifications').insert({
    user_id: target.id,
    message: `Your ${deniedRole} role request was not approved. Your account has been set to employee access.`,
  });

  await emailService.roleDenied({ email: target.email, name: target.name, role: deniedRole }).catch(() => {});

  res.json(user);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const target = await db('users').where({ id: req.params.id }).first();
  if (!target) return res.status(404).json({ error: 'User not found' });

  const claimCount = await db('claims').where({ user_id: req.params.id }).count('id as count').first();
  if (parseInt(claimCount.count) > 0) {
    return res.status(409).json({ error: 'User has claims — change their role instead of deleting' });
  }

  await db('users').where({ id: req.params.id }).delete();
  res.status(204).end();
});

module.exports = router;
