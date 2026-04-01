const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const authenticate = require('../middleware/auth');

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
  const { name, email, password, department, employee_id, manager_id } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'name too long' });
  if (email.length > 200) return res.status(400).json({ error: 'email too long' });

  const existing = await db('users').where({ email }).first();
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  // Roles are assigned by admins — self-registration always creates an employee
  const role = 'employee';

  if (manager_id) {
    const mgr = await db('users').where({ id: manager_id }).whereIn('role', ['manager', 'admin']).first();
    if (!mgr) return res.status(400).json({ error: 'Invalid manager selected' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users')
    .insert({ name, email, password_hash, role, department, employee_id, manager_id: manager_id || null })
    .returning(['id', 'name', 'email', 'role', 'department', 'employee_id', 'manager_id']);

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
    .select('id', 'name', 'email', 'role', 'department', 'employee_id', 'manager_id', 'created_at')
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

module.exports = router;
