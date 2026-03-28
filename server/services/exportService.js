const db = require('../db/connection');

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))];
  return lines.join('\r\n');
}

async function generateBatchCsv(batchId) {
  const items = await db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .join('users', 'claims.user_id', 'users.id')
    .join('batches', 'claims.batch_id', 'batches.id')
    .where('claims.batch_id', batchId)
    .select(
      'users.employee_id',
      'claims.id as claim_id',
      'claim_items.id as item_id',
      'claim_items.expense_type',
      'claim_items.type as item_type',
      'claim_items.transaction_date as date',
      'claim_items.business_purpose as description',
      db.raw("COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0) as net_amount"),
      'claim_items.vat',
      db.raw("COALESCE(claim_items.amount, claim_items.reimbursement_amount, 0) + COALESCE(claim_items.vat, 0) as total"),
      'claim_items.currency',
      'claim_items.department',
      'claim_items.project as project_code',
      'claim_items.billable',
      'batches.id as batch_id',
      'batches.name as batch_name'
    )
    .orderBy(['claims.id', 'claim_items.transaction_date']);

  return toCsv(items);
}

module.exports = { generateBatchCsv };
