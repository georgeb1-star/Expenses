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

module.exports = router;
