const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const emailService = require('../services/emailService');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// GET /api/auth/managers — public list of managers for registration form
router.get('/managers', async (req, res) => {
  const managers = await db('users')
    .whereIn('role', ['manager', 'admin'])
    .select('id', 'name', 'department')
    .orderBy('name');
  res.json(managers);
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, department, employee_id, manager_id, role: requestedRole } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'name too long' });
  if (email.length > 200) return res.status(400).json({ error: 'email too long' });

  const existing = await db('users').where({ email }).first();
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  // Elevated roles require admin approval — account is created as employee with pending_role set
  const ELEVATED_ROLES = ['manager', 'processor'];
  const role = 'employee';
  const pending_role = ELEVATED_ROLES.includes(requestedRole) ? requestedRole : null;

  if (manager_id) {
    const mgr = await db('users').where({ id: manager_id }).whereIn('role', ['manager', 'admin']).first();
    if (!mgr) return res.status(400).json({ error: 'Invalid manager selected' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users')
    .insert({ name, email, password_hash, role, department, employee_id, manager_id: manager_id || null, pending_role })
    .returning(['id', 'name', 'email', 'role', 'pending_role', 'department', 'employee_id', 'manager_id']);

  // Notify all admins if this account needs role approval
  if (pending_role) {
    const admins = await db('users').where({ role: 'admin' }).select('id');
    const roleLabel = pending_role.charAt(0).toUpperCase() + pending_role.slice(1);
    if (admins.length) {
      await db('notifications').insert(
        admins.map((a) => ({
          user_id: a.id,
          message: `New ${roleLabel} registration requires approval: ${name} (${email})`,
        }))
      );
    }
    await emailService.roleRequestPending({ name, email, requestedRole: pending_role }).catch(() => {});
  }

  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await db('users').where({ email }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { password_hash, ...safeUser } = user;
  res.json({ token: signToken(safeUser), user: safeUser });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await db('users')
    .where({ id: req.user.id })
    .select('id', 'name', 'email', 'role', 'pending_role', 'department', 'employee_id', 'manager_id', 'created_at')
    .first();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH /api/auth/me — update own profile (name, department, manager_id)
router.patch('/me', authenticate, async (req, res) => {
  const { name, department, manager_id } = req.body;
  const updates = {};
  if (name !== undefined) {
    if (name.length > 100) return res.status(400).json({ error: 'name too long' });
    updates.name = name;
  }
  if (department !== undefined) updates.department = department;
  if (manager_id !== undefined) {
    if (manager_id) {
      const mgr = await db('users').where({ id: manager_id }).whereIn('role', ['manager', 'admin']).first();
      if (!mgr) return res.status(400).json({ error: 'Invalid manager selected' });
    }
    updates.manager_id = manager_id || null;
  }

  const [user] = await db('users')
    .where({ id: req.user.id })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning(['id', 'name', 'email', 'role', 'department', 'employee_id', 'manager_id']);
  res.json(user);
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Always respond 200 to prevent user enumeration
  const user = await db('users').where({ email }).first();
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db('users').where({ id: user.id }).update({ reset_token: token, reset_token_expires: expires });

  const base = process.env.APP_URL || 'https://expenseflow.vercel.app';
  const resetLink = `${base}/reset-password?token=${token}`;

  await emailService.sendPasswordReset({ email: user.email, name: user.name, resetLink }).catch(() => {});

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const user = await db('users')
    .where('reset_token', token)
    .where('reset_token_expires', '>', new Date())
    .first();

  if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

  const password_hash = await bcrypt.hash(password, 10);
  await db('users').where({ id: user.id }).update({
    password_hash,
    reset_token: null,
    reset_token_expires: null,
  });

  res.json({ message: 'Password updated successfully.' });
});

module.exports = router;
