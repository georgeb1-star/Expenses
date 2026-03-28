const db = require('../db/connection');

const POLICY_AMOUNT_THRESHOLD = 500; // £500

async function runAlertEngine(claimId) {
  const claim = await db('claims').where({ id: claimId }).first();
  if (!claim) throw new Error('Claim not found');

  const items = await db('claim_items').where({ claim_id: claimId });

  // Clear previous unresolved alerts for this claim
  await db('alerts').where({ claim_id: claimId, resolved: false }).delete();

  const newAlerts = [];

  for (const item of items) {
    // 1. Missing receipt (non-mileage only)
    if (item.type === 'expense') {
      const receiptCount = await db('receipts').where({ claim_item_id: item.id }).count('id as c').first();
      if (Number(receiptCount.c) === 0) {
        newAlerts.push({
          claim_id: claimId,
          claim_item_id: item.id,
          type: 'missing_receipt',
          severity: 'error',
          message: `Receipt is missing for "${item.expense_type || 'expense'}" on ${item.transaction_date}`,
        });
      }
    }

    // 2. Missing business purpose
    if (!item.business_purpose || item.business_purpose.trim() === '') {
      newAlerts.push({
        claim_id: claimId,
        claim_item_id: item.id,
        type: 'missing_field',
        severity: 'error',
        message: `Business purpose is missing for item on ${item.transaction_date}`,
      });
    }

    // 3. Missing department
    if (!item.department || item.department.trim() === '') {
      newAlerts.push({
        claim_id: claimId,
        claim_item_id: item.id,
        type: 'missing_field',
        severity: 'error',
        message: `Department is missing for item on ${item.transaction_date}`,
      });
    }

    // 4. Policy violation — amount over threshold
    const total = parseFloat(item.amount || 0) + parseFloat(item.vat || 0);
    if (total > POLICY_AMOUNT_THRESHOLD) {
      newAlerts.push({
        claim_id: claimId,
        claim_item_id: item.id,
        type: 'policy_violation',
        severity: 'warning',
        message: `Amount £${total.toFixed(2)} exceeds policy threshold of £${POLICY_AMOUNT_THRESHOLD}`,
      });
    }

    // 5. Duplicate detection — same user, date, amount in another claim
    if (item.type === 'expense' && item.amount) {
      const duplicate = await db('claim_items')
        .join('claims', 'claim_items.claim_id', 'claims.id')
        .where('claims.user_id', claim.user_id)
        .where('claim_items.transaction_date', item.transaction_date)
        .where('claim_items.amount', item.amount)
        .whereNot('claim_items.id', item.id)
        .whereNot('claims.status', 'draft')
        .first();

      if (duplicate) {
        newAlerts.push({
          claim_id: claimId,
          claim_item_id: item.id,
          type: 'duplicate',
          severity: 'warning',
          message: `Possible duplicate: another claim has the same date and amount (£${item.amount})`,
        });
      }
    }
  }

  if (newAlerts.length) await db('alerts').insert(newAlerts);
  return newAlerts;
}

module.exports = { runAlertEngine };
