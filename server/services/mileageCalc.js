const db = require('../db/connection');

const RATE_STANDARD = 0.45;
const RATE_REDUCED = 0.25;
const THRESHOLD = 10000;

function getTaxYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed
  const day = d.getDate();
  // Tax year starts April 6
  if (month > 4 || (month === 4 && day >= 6)) {
    return { start: `${year}-04-06`, end: `${year + 1}-04-05` };
  }
  return { start: `${year - 1}-04-06`, end: `${year}-04-05` };
}

async function calculateReimbursement(userId, distance, transactionDate, excludeItemId = null) {
  const { start, end } = getTaxYear(transactionDate);

  let query = db('claim_items')
    .join('claims', 'claim_items.claim_id', 'claims.id')
    .where('claims.user_id', userId)
    .where('claim_items.type', 'mileage')
    .whereBetween('claim_items.transaction_date', [start, end])
    .whereNotIn('claims.status', ['draft']); // only count committed miles

  if (excludeItemId) query = query.whereNot('claim_items.id', excludeItemId);

  const result = await query.sum('claim_items.distance as total').first();
  const priorMiles = parseFloat(result.total || 0);

  const dist = parseFloat(distance);
  let amount = 0;

  if (priorMiles >= THRESHOLD) {
    // All at reduced rate
    amount = dist * RATE_REDUCED;
  } else if (priorMiles + dist <= THRESHOLD) {
    // All at standard rate
    amount = dist * RATE_STANDARD;
  } else {
    // Split
    const standardMiles = THRESHOLD - priorMiles;
    const reducedMiles = dist - standardMiles;
    amount = standardMiles * RATE_STANDARD + reducedMiles * RATE_REDUCED;
  }

  return Math.round(amount * 100) / 100;
}

module.exports = { calculateReimbursement };
