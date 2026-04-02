const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'ExpenseFlow <noreply@citipost.co.uk>';

async function sendEmail(to, subject, html) {
  if (!resend) {
    console.log(`[email skipped — no RESEND_API_KEY] To: ${to} | ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    // Email failures must never break the calling action
    console.error('Email send failed:', err.message);
  }
}

function claimLink(claimId) {
  const base = process.env.APP_URL || 'https://expenseflow.vercel.app';
  return `${base}/claims/${claimId}`;
}

module.exports = {
  async claimSubmitted({ managerEmail, managerName, employeeName, claimTitle, claimId }) {
    await sendEmail(
      managerEmail,
      `Action required: "${claimTitle}" submitted for review`,
      `<p>Hi ${managerName},</p>
       <p><strong>${employeeName}</strong> has submitted a new expense claim for your review:</p>
       <p><strong>${claimTitle}</strong></p>
       <p><a href="${claimLink(claimId)}">Review claim →</a></p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },

  async claimApproved({ employeeEmail, employeeName, claimTitle, claimId, managerName }) {
    await sendEmail(
      employeeEmail,
      `Claim approved: "${claimTitle}"`,
      `<p>Hi ${employeeName},</p>
       <p>Your expense claim has been <strong>approved</strong> by ${managerName} and sent to finance.</p>
       <p><strong>${claimTitle}</strong></p>
       <p><a href="${claimLink(claimId)}">View claim →</a></p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },

  async claimRejected({ employeeEmail, employeeName, claimTitle, claimId, managerName, comment }) {
    await sendEmail(
      employeeEmail,
      `Claim returned: "${claimTitle}"`,
      `<p>Hi ${employeeName},</p>
       <p>Your expense claim has been <strong>returned</strong> by ${managerName} for the following reason:</p>
       <blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#555">${comment}</blockquote>
       <p>Please update and resubmit.</p>
       <p><a href="${claimLink(claimId)}">Edit claim →</a></p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },

  async sendPasswordReset({ email, name, resetLink }) {
    await sendEmail(
      email,
      'Reset your ExpenseFlow password',
      `<p>Hi ${name},</p>
       <p>We received a request to reset your password. Click the link below — it expires in 1 hour.</p>
       <p><a href="${resetLink}" style="background:#CC1719;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reset password →</a></p>
       <p>If you didn't request this, you can safely ignore this email.</p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },

  async roleRequestPending({ name, email, requestedRole }) {
    const roleLabel = requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1);
    await sendEmail(
      email,
      'Your account is pending approval',
      `<p>Hi ${name},</p>
       <p>Your account has been created and your request for <strong>${roleLabel}</strong> access is pending review by an administrator.</p>
       <p>You'll receive an email once your role has been reviewed. In the meantime you can log in and wait for approval.</p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },

  async roleApproved({ email, name, role }) {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    await sendEmail(
      email,
      `Your ${roleLabel} access has been approved`,
      `<p>Hi ${name},</p>
       <p>An administrator has approved your <strong>${roleLabel}</strong> role request. You now have full ${roleLabel} access.</p>
       <p><strong>Please log out and log back in</strong> to activate your new role.</p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },

  async roleDenied({ email, name, role }) {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    await sendEmail(
      email,
      `Update on your ${roleLabel} access request`,
      `<p>Hi ${name},</p>
       <p>An administrator has reviewed your <strong>${roleLabel}</strong> role request and it was not approved at this time.</p>
       <p>Your account remains active with standard employee access. If you believe this is incorrect, please contact your administrator.</p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },

  async auditRejected({ employeeEmail, employeeName, managerEmail, managerName, claimTitle, claimId, comment }) {
    await sendEmail(
      managerEmail,
      `Claim failed audit: "${claimTitle}"`,
      `<p>Hi ${managerName},</p>
       <p>A claim you approved has <strong>failed finance audit</strong> and been returned to your queue:</p>
       <p><strong>${claimTitle}</strong> (submitted by ${employeeName})</p>
       <blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#555">${comment}</blockquote>
       <p><a href="${claimLink(claimId)}">Review claim →</a></p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
    await sendEmail(
      employeeEmail,
      `Update on your claim: "${claimTitle}"`,
      `<p>Hi ${employeeName},</p>
       <p>Your claim <strong>${claimTitle}</strong> has been returned by finance audit. Your manager has been notified.</p>
       <p style="color:#888;font-size:12px">ExpenseFlow · Citipost</p>`
    );
  },
};
