const db = require('../db/connection');

const TRANSITIONS = {
  draft: { submit: 'submitted' },
  submitted: { manager_review: 'manager_review' },
  manager_review: { approve: 'approved', reject: 'draft' },
  approved: { audit: 'audit' },
  audit: { audit_approve: 'processing', audit_reject: 'manager_review' },
  processing: { export: 'exported' },
};

async function transition(claimId, action, userId, details = {}) {
  const claim = await db('claims').where({ id: claimId }).first();
  if (!claim) throw Object.assign(new Error('Claim not found'), { status: 404 });

  const allowed = TRANSITIONS[claim.status];
  if (!allowed || !allowed[action]) {
    throw Object.assign(
      new Error(`Cannot perform '${action}' on a claim with status '${claim.status}'`),
      { status: 422 }
    );
  }

  const newStatus = allowed[action];
  const updates = { status: newStatus, updated_at: db.fn.now() };

  if (action === 'submit') updates.submitted_at = db.fn.now();
  if (action === 'approve') updates.approved_at = db.fn.now();

  await db('claims').where({ id: claimId }).update(updates);

  await db('audit_logs').insert({
    claim_id: claimId,
    user_id: userId,
    action,
    details: JSON.stringify({ from: claim.status, to: newStatus, ...details }),
  });

  return { ...claim, status: newStatus };
}

async function notify(userIds, claimId, message) {
  try {
    const rows = userIds.filter(Boolean).map((user_id) => ({
      user_id,
      claim_id: claimId,
      message,
    }));
    if (rows.length) await db('notifications').insert(rows);
  } catch (err) {
    // Notification failures must never break the calling action
    console.error('Notification insert failed:', err.message);
  }
}

module.exports = { transition, notify };
