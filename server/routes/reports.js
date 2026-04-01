const router = require('express').Router();
const db = require('../db/connection');
const authenticate = require('../middleware/auth');
const allow = require('../middleware/rbac');

router.use(authenticate);

// GET /api/reports/summary?month=2025-03
router.get('/summary', allow('processor', 'admin', 'manager'), async (req, res) => {
  const { month } = req.query; // e.g. "2025-03"

  let dateFilter = {};
  if (month) {
    const [year, m] = month.split('-').map(Number);
    dateFilter = {
      start: `${year}-${String(m).padStart(2, '0')}-01`,
      end: new Date(year, m, 0).toISOString().slice(0, 10), // last day of month
    };
  }

  let q = db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .join('users', 'claims.user_id', 'users.id')
    .where('claims.status', 'exported');

  if (dateFilter.start) {
    q = q.whereBetween('claim_items.transaction_date', [dateFilter.start, dateFilter.end]);
  }

  const [totalRow] = await q.clone().sum({
    total_amount: db.raw('COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)'),
    total_vat: 'claim_items.vat',
  });

  const byCategory = await q.clone()
    .groupBy('claim_items.expense_type', 'claim_items.type')
    .select(
      db.raw("COALESCE(claim_items.expense_type, claim_items.type) as category"),
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount'),
      db.raw('COUNT(*) as count')
    )
    .orderBy('amount', 'desc');

  const byDepartment = await q.clone()
    .groupBy('users.department')
    .select(
      'users.department',
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount'),
      db.raw('COUNT(*) as count')
    )
    .orderBy('amount', 'desc');

  const monthly = await db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .where('claims.status', 'exported')
    .groupBy(db.raw("TO_CHAR(claim_items.transaction_date, 'YYYY-MM')"))
    .select(
      db.raw("TO_CHAR(claim_items.transaction_date, 'YYYY-MM') as month"),
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount')
    )
    .orderBy('month', 'asc')
    .limit(12);

  const topSpenders = await q.clone()
    .groupBy('users.id', 'users.name', 'users.department')
    .select(
      'users.name',
      'users.department',
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount'),
      db.raw('COUNT(DISTINCT claims.id) as claim_count')
    )
    .orderBy('amount', 'desc')
    .limit(10);

  const itemCount = await q.clone().count('claim_items.id as count').first();

  res.json({
    total_amount: parseFloat(totalRow.total_amount || 0),
    total_vat: parseFloat(totalRow.total_vat || 0),
    item_count: parseInt(itemCount.count || 0),
    by_category: byCategory,
    by_department: byDepartment,
    monthly_trend: monthly,
    top_spenders: topSpenders,
  });
});

// GET /api/reports/team-summary — team spend data scoped to the manager's direct reports
router.get('/team-summary', async (req, res) => {
  if (!['manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const managerId = req.user.id;

  // Pending claims (submitted/manager_review assigned to this manager)
  const pendingClaims = await db('claims')
    .whereIn('status', ['submitted', 'manager_review'])
    .where('manager_id', managerId);
  const pendingIds = pendingClaims.map((c) => c.id);

  let pendingAmount = 0;
  if (pendingIds.length) {
    const [row] = await db('claim_items')
      .whereIn('claim_id', pendingIds)
      .sum({ total: db.raw('COALESCE(amount, reimbursement_amount, 0)') });
    pendingAmount = parseFloat(row.total || 0);
  }

  // Approved/exported base query (team spend)
  const approvedBase = db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .whereIn('claims.status', ['approved', 'processing', 'exported'])
    .where('claims.manager_id', managerId);

  // All-time approved total
  const [totalRow] = await approvedBase.clone()
    .sum({ total: db.raw('COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)') });

  // This month's approved total
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [monthRow] = await approvedBase.clone()
    .whereBetween('claim_items.transaction_date', [monthStart, monthEnd])
    .sum({ total: db.raw('COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)') });

  // Team size
  const [{ count: teamSize }] = await db('users').where({ manager_id: managerId }).count('id as count');

  // By category
  const byCategory = await approvedBase.clone()
    .groupBy('claim_items.expense_type', 'claim_items.type')
    .select(
      db.raw("COALESCE(claim_items.expense_type, claim_items.type) as category"),
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount')
    )
    .orderBy('amount', 'desc')
    .limit(6);

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const trendCutoff = sixMonthsAgo.toISOString().slice(0, 10);
  const monthlyTrend = await approvedBase.clone()
    .where('claim_items.transaction_date', '>=', trendCutoff)
    .groupBy(db.raw("TO_CHAR(claim_items.transaction_date, 'YYYY-MM')"))
    .select(
      db.raw("TO_CHAR(claim_items.transaction_date, 'YYYY-MM') as month"),
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount')
    )
    .orderBy('month', 'asc');

  // Per-employee breakdown (team members with approved spend + pending count)
  const teamMembers = await db('users').where({ manager_id: managerId }).select('id', 'name', 'department');
  const teamIds = teamMembers.map((u) => u.id);

  let employeeSpend = [];
  if (teamIds.length) {
    employeeSpend = await db('claim_items')
      .join('claims', 'claim_items.claim_id', 'claims.id')
      .whereIn('claims.status', ['approved', 'processing', 'exported'])
      .whereIn('claims.user_id', teamIds)
      .groupBy('claims.user_id')
      .select(
        'claims.user_id',
        db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as total_amount'),
        db.raw('COUNT(DISTINCT claims.id) as claim_count')
      );
  }

  const pendingByEmployee = pendingIds.length
    ? await db('claims')
        .whereIn('id', pendingIds)
        .groupBy('user_id')
        .select('user_id', db.raw('COUNT(*) as pending_count'))
    : [];

  const spendMap = Object.fromEntries(employeeSpend.map((e) => [e.user_id, e]));
  const pendingMap = Object.fromEntries(pendingByEmployee.map((e) => [e.user_id, Number(e.pending_count)]));

  const byEmployee = teamMembers.map((u) => ({
    id: u.id,
    name: u.name,
    department: u.department,
    total_amount: parseFloat(spendMap[u.id]?.total_amount || 0),
    claim_count: parseInt(spendMap[u.id]?.claim_count || 0),
    pending_count: pendingMap[u.id] || 0,
  })).sort((a, b) => b.total_amount - a.total_amount);

  res.json({
    pending_count: pendingClaims.length,
    pending_amount: pendingAmount,
    approved_this_month: parseFloat(monthRow.total || 0),
    total_approved: parseFloat(totalRow.total || 0),
    team_size: parseInt(teamSize || 0),
    by_category: byCategory,
    monthly_trend: monthlyTrend,
    by_employee: byEmployee,
  });
});

// GET /api/reports/employee-summary — personal spend data for the logged-in user
// Data only includes items from claims approved by the processor (status = processing or exported)
router.get('/employee-summary', async (req, res) => {
  const userId = req.user.id;

  const approvedBase = db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .whereIn('claims.status', ['processing', 'exported'])
    .where('claims.user_id', userId);

  // Total approved (all-time)
  const [totalRow] = await approvedBase.clone()
    .sum({ total: db.raw('COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)') });

  // Total approved this calendar month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [monthRow] = await approvedBase.clone()
    .whereBetween('claim_items.transaction_date', [monthStart, monthEnd])
    .sum({ total: db.raw('COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)') });

  // Total pending (in-flight claims not yet processor-approved)
  const [pendingRow] = await db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .whereIn('claims.status', ['submitted', 'manager_review', 'auditing'])
    .where('claims.user_id', userId)
    .sum({ total: db.raw('COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)') });

  // Daily trend — last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10);

  const dailyTrend = await approvedBase.clone()
    .where('claim_items.transaction_date', '>=', cutoff)
    .groupBy('claim_items.transaction_date')
    .select(
      db.raw("TO_CHAR(claim_items.transaction_date, 'YYYY-MM-DD') as date"),
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount')
    )
    .orderBy('date', 'asc');

  // By category
  const byCategory = await approvedBase.clone()
    .groupBy('claim_items.expense_type', 'claim_items.type')
    .select(
      db.raw("COALESCE(claim_items.expense_type, claim_items.type) as category"),
      db.raw('SUM(COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0)) as amount')
    )
    .orderBy('amount', 'desc')
    .limit(5);

  // Recent approved items
  const recentItems = await approvedBase.clone()
    .join('claims as c2', 'claim_items.claim_id', 'c2.id')
    .select(
      db.raw("TO_CHAR(claim_items.transaction_date, 'YYYY-MM-DD') as date"),
      'claim_items.supplier',
      db.raw("COALESCE(claim_items.expense_type, claim_items.type) as expense_type"),
      db.raw('COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0) as amount'),
      'c2.title as claim_title'
    )
    .orderBy('claim_items.transaction_date', 'desc')
    .limit(10);

  res.json({
    total_approved: parseFloat(totalRow.total || 0),
    total_this_month: parseFloat(monthRow.total || 0),
    total_pending: parseFloat(pendingRow.total || 0),
    daily_trend: dailyTrend,
    by_category: byCategory,
    recent_items: recentItems,
  });
});

module.exports = router;
