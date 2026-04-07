/**
 * Demo data seed — populates the system so it looks actively used.
 * Run AFTER 001_test_users.js (which creates the base users).
 *
 * Creates:
 *  - 8 additional employees across departments
 *  - ~30 claims in various workflow states
 *  - Expense & mileage items with realistic descriptions
 *  - Comments, audit logs, alerts, notifications
 *  - 2 exported batches + 1 in-progress batch
 */

exports.seed = async function (knex) {
  const bcrypt = require('bcryptjs');
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ── Fetch existing users ──────────────────────────────────────────
  const admin = await knex('users').where({ email: 'admin@example.com' }).first();
  const manager = await knex('users').where({ email: 'manager@example.com' }).first();
  const processor = await knex('users').where({ email: 'processor@example.com' }).first();
  const employee = await knex('users').where({ email: 'employee@example.com' }).first();
  const jane = await knex('users').where({ email: 'jane@example.com' }).first();

  // ── Additional employees ──────────────────────────────────────────
  const [mark] = await knex('users').insert({
    name: 'Mark Thompson', email: 'mark.t@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Engineering', employee_id: 'EMP006', manager_id: manager.id,
  }).returning('*');

  const [lisa] = await knex('users').insert({
    name: 'Lisa Chen', email: 'lisa.chen@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Sales', employee_id: 'EMP007', manager_id: manager.id,
  }).returning('*');

  const [david] = await knex('users').insert({
    name: 'David Okafor', email: 'david.o@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Engineering', employee_id: 'EMP008', manager_id: manager.id,
  }).returning('*');

  const [priya] = await knex('users').insert({
    name: 'Priya Patel', email: 'priya.p@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Operations', employee_id: 'EMP009', manager_id: manager.id,
  }).returning('*');

  const [tom] = await knex('users').insert({
    name: 'Tom Williams', email: 'tom.w@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Sales', employee_id: 'EMP010', manager_id: manager.id,
  }).returning('*');

  const [rachel] = await knex('users').insert({
    name: 'Rachel Green', email: 'rachel.g@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Marketing', employee_id: 'EMP011', manager_id: manager.id,
  }).returning('*');

  const [sam] = await knex('users').insert({
    name: 'Sam Hussain', email: 'sam.h@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Operations', employee_id: 'EMP012', manager_id: manager.id,
  }).returning('*');

  const [emma] = await knex('users').insert({
    name: 'Emma Clarke', email: 'emma.c@example.com', password_hash: hash('password'),
    role: 'employee', department: 'Engineering', employee_id: 'EMP013', manager_id: manager.id,
  }).returning('*');

  // Helper: date relative to today
  const d = (daysAgo, h = 9, m = 0) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    dt.setHours(h, m, 0, 0);
    return dt;
  };
  const dateOnly = (daysAgo) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString().slice(0, 10);
  };

  // ── Helper: insert claim + items + audit in one go ────────────────
  async function createClaim({ user, title, status, items, comments: claimComments, daysAgo, manager_id: mgr, batch_id }) {
    const submitted_at = status !== 'draft' ? d(daysAgo, 10, 15) : null;
    const approved_at = ['approved','audit','processing','exported'].includes(status) ? d(daysAgo - 1, 14, 30) : null;

    const [claim] = await knex('claims').insert({
      user_id: user.id,
      title,
      status,
      submitted_at,
      manager_id: mgr || null,
      approved_at,
      batch_id: batch_id || null,
    }).returning('*');

    // Items
    for (const item of items) {
      await knex('claim_items').insert({
        claim_id: claim.id,
        type: item.type || 'expense',
        expense_type: item.expense_type || null,
        supplier: item.supplier || null,
        transaction_date: item.date,
        amount: item.amount || 0,
        vat: item.vat || 0,
        currency: 'GBP',
        payment_type: item.payment_type || 'personal_card',
        business_purpose: item.business_purpose || null,
        department: user.department,
        project: item.project || null,
        billable: item.billable || false,
        client_name: item.client_name || null,
        from_location: item.from_location || null,
        to_location: item.to_location || null,
        vehicle_type: item.vehicle_type || null,
        distance: item.distance || null,
        reimbursement_amount: item.reimbursement_amount || null,
      });
    }

    // Audit trail
    if (status !== 'draft') {
      await knex('audit_logs').insert({
        claim_id: claim.id, user_id: user.id, action: 'submit',
        details: JSON.stringify({ from: 'draft', to: 'submitted' }),
        created_at: d(daysAgo, 10, 15),
      });
    }
    if (['manager_review','approved','audit','processing','exported'].includes(status) && mgr) {
      await knex('audit_logs').insert({
        claim_id: claim.id, user_id: mgr, action: 'manager_review',
        details: JSON.stringify({ from: 'submitted', to: 'manager_review' }),
        created_at: d(daysAgo, 11, 0),
      });
    }
    if (['approved','audit','processing','exported'].includes(status) && mgr) {
      await knex('audit_logs').insert({
        claim_id: claim.id, user_id: mgr, action: 'approve',
        details: JSON.stringify({ from: 'manager_review', to: 'approved' }),
        created_at: d(daysAgo - 1, 14, 30),
      });
    }
    if (['audit','processing','exported'].includes(status)) {
      await knex('audit_logs').insert({
        claim_id: claim.id, user_id: processor.id, action: 'audit',
        details: JSON.stringify({ from: 'approved', to: 'audit' }),
        created_at: d(daysAgo - 2, 9, 0),
      });
    }
    if (['processing','exported'].includes(status)) {
      await knex('audit_logs').insert({
        claim_id: claim.id, user_id: processor.id, action: 'audit_approve',
        details: JSON.stringify({ from: 'audit', to: 'processing' }),
        created_at: d(daysAgo - 2, 15, 0),
      });
    }
    if (status === 'exported') {
      await knex('audit_logs').insert({
        claim_id: claim.id, user_id: processor.id, action: 'export',
        details: JSON.stringify({ from: 'processing', to: 'exported' }),
        created_at: d(daysAgo - 3, 16, 0),
      });
    }

    // Comments
    if (claimComments) {
      for (const c of claimComments) {
        await knex('comments').insert({
          claim_id: claim.id,
          user_id: c.userId,
          message: c.message,
          created_at: d(c.daysAgo, c.hour || 12, 0),
        });
      }
    }

    // Notifications for the claim owner
    if (status !== 'draft') {
      await knex('notifications').insert({
        user_id: user.id,
        claim_id: claim.id,
        message: `Your claim "${title}" has been ${status === 'submitted' ? 'submitted' : status === 'manager_review' ? 'picked up for review' : status}.`,
        read: ['exported','processing','audit'].includes(status),
        created_at: d(daysAgo, 10, 20),
      });
    }

    return claim;
  }

  // ══════════════════════════════════════════════════════════════════
  //  BATCHES  (create first so exported claims can reference them)
  // ══════════════════════════════════════════════════════════════════

  const [batchMarch] = await knex('batches').insert({
    name: 'March 2026 — Week 4',
    processor_id: processor.id,
    exported_at: d(14, 16, 0),
    created_at: d(15),
  }).returning('*');

  const [batchApril1] = await knex('batches').insert({
    name: 'April 2026 — Week 1',
    processor_id: processor.id,
    exported_at: d(5, 16, 0),
    created_at: d(6),
  }).returning('*');

  const [batchCurrent] = await knex('batches').insert({
    name: 'April 2026 — Week 2',
    processor_id: processor.id,
    exported_at: null,
    created_at: d(1),
  }).returning('*');

  // ══════════════════════════════════════════════════════════════════
  //  EXPORTED CLAIMS  (completed workflow — batch March)
  // ══════════════════════════════════════════════════════════════════

  await createClaim({
    user: employee, title: 'London client meeting — March', status: 'exported', daysAgo: 20,
    manager_id: manager.id, batch_id: batchMarch.id,
    items: [
      { expense_type: 'travel', supplier: 'Trainline', date: dateOnly(22), amount: 87.50, vat: 0, business_purpose: 'Train to London Euston for Acme Corp meeting', project: 'ACME-2026' },
      { expense_type: 'subsistence', supplier: 'Pret A Manger', date: dateOnly(22), amount: 8.45, vat: 1.41, business_purpose: 'Lunch during client visit', project: 'ACME-2026' },
      { expense_type: 'travel', supplier: 'TfL', date: dateOnly(22), amount: 5.80, vat: 0, business_purpose: 'Tube: Euston to Canary Wharf', project: 'ACME-2026' },
    ],
  });

  await createClaim({
    user: lisa, title: 'Q1 sales conference — Birmingham', status: 'exported', daysAgo: 18,
    manager_id: manager.id, batch_id: batchMarch.id,
    items: [
      { expense_type: 'accommodation', supplier: 'Premier Inn Birmingham', date: dateOnly(20), amount: 129.00, vat: 21.50, business_purpose: 'Overnight for 2-day sales conference' },
      { expense_type: 'subsistence', supplier: 'Various', date: dateOnly(20), amount: 32.60, vat: 5.43, business_purpose: 'Meals during conference (dinner + breakfast)' },
      { expense_type: 'entertainment', supplier: 'The Ivy Birmingham', date: dateOnly(19), amount: 145.00, vat: 24.17, business_purpose: 'Client dinner with Globex team', billable: true, client_name: 'Globex Ltd', client_reference: 'GLX-001' },
    ],
  });

  await createClaim({
    user: mark, title: 'Dev equipment — monitor', status: 'exported', daysAgo: 16,
    manager_id: manager.id, batch_id: batchMarch.id,
    items: [
      { expense_type: 'equipment', supplier: 'Amazon Business', date: dateOnly(18), amount: 349.99, vat: 58.33, business_purpose: 'External 4K monitor for home office setup', payment_type: 'company_card' },
    ],
  });

  await createClaim({
    user: priya, title: 'Manchester site visit mileage', status: 'exported', daysAgo: 17,
    manager_id: manager.id, batch_id: batchMarch.id,
    items: [
      { type: 'mileage', date: dateOnly(19), from_location: 'Leeds Office', to_location: 'Manchester Depot', vehicle_type: 'car', distance: 45, reimbursement_amount: 20.25, business_purpose: 'Quarterly inventory check' },
      { type: 'mileage', date: dateOnly(19), from_location: 'Manchester Depot', to_location: 'Leeds Office', vehicle_type: 'car', distance: 45, reimbursement_amount: 20.25, business_purpose: 'Return trip' },
    ],
  });

  // ── Exported claims — batch April Week 1 ──────────────────────────

  await createClaim({
    user: jane, title: 'Marketing photoshoot supplies', status: 'exported', daysAgo: 10,
    manager_id: manager.id, batch_id: batchApril1.id,
    items: [
      { expense_type: 'equipment', supplier: 'Ryman', date: dateOnly(12), amount: 45.80, vat: 7.63, business_purpose: 'Props and display boards for product photoshoot' },
      { expense_type: 'subsistence', supplier: 'Deliveroo', date: dateOnly(12), amount: 38.50, vat: 6.42, business_purpose: 'Team lunch during all-day shoot' },
    ],
  });

  await createClaim({
    user: tom, title: 'Edinburgh client onboarding trip', status: 'exported', daysAgo: 9,
    manager_id: manager.id, batch_id: batchApril1.id,
    items: [
      { expense_type: 'travel', supplier: 'British Airways', date: dateOnly(11), amount: 189.00, vat: 0, business_purpose: 'Flight LHR-EDI for Initech onboarding' },
      { expense_type: 'accommodation', supplier: 'Hilton Edinburgh', date: dateOnly(11), amount: 155.00, vat: 25.83, business_purpose: 'Overnight stay for client onboarding', billable: true, client_name: 'Initech', client_reference: 'INT-2026-04' },
      { expense_type: 'travel', supplier: 'Uber', date: dateOnly(11), amount: 22.40, vat: 3.73, business_purpose: 'Airport to hotel + hotel to client office' },
      { expense_type: 'subsistence', supplier: 'Various', date: dateOnly(10), amount: 27.90, vat: 4.65, business_purpose: 'Meals during Edinburgh trip' },
    ],
  });

  await createClaim({
    user: david, title: 'AWS Summit London', status: 'exported', daysAgo: 8,
    manager_id: manager.id, batch_id: batchApril1.id,
    items: [
      { expense_type: 'travel', supplier: 'Trainline', date: dateOnly(10), amount: 65.00, vat: 0, business_purpose: 'Train to London for AWS Summit conference' },
      { expense_type: 'subsistence', supplier: 'Various', date: dateOnly(10), amount: 18.75, vat: 3.13, business_purpose: 'Lunch and coffee at ExCeL' },
    ],
  });

  // ══════════════════════════════════════════════════════════════════
  //  PROCESSING CLAIMS  (in current batch, awaiting export)
  // ══════════════════════════════════════════════════════════════════

  await createClaim({
    user: sam, title: 'Leeds warehouse audit travel', status: 'processing', daysAgo: 5,
    manager_id: manager.id, batch_id: batchCurrent.id,
    items: [
      { type: 'mileage', date: dateOnly(6), from_location: 'Head Office', to_location: 'Leeds Warehouse', vehicle_type: 'car', distance: 32, reimbursement_amount: 14.40, business_purpose: 'Warehouse stock audit Q1' },
      { expense_type: 'subsistence', supplier: 'Greggs', date: dateOnly(6), amount: 6.20, vat: 1.03, business_purpose: 'Lunch on site' },
    ],
  });

  await createClaim({
    user: emma, title: 'Software licence renewal', status: 'processing', daysAgo: 4,
    manager_id: manager.id, batch_id: batchCurrent.id,
    items: [
      { expense_type: 'equipment', supplier: 'JetBrains', date: dateOnly(5), amount: 199.00, vat: 33.17, business_purpose: 'IntelliJ IDEA annual licence renewal', payment_type: 'personal_card' },
    ],
  });

  // ══════════════════════════════════════════════════════════════════
  //  AUDIT STAGE  (processor reviewing)
  // ══════════════════════════════════════════════════════════════════

  await createClaim({
    user: employee, title: 'April client lunches', status: 'audit', daysAgo: 3,
    manager_id: manager.id,
    items: [
      { expense_type: 'entertainment', supplier: 'Wagamama', date: dateOnly(4), amount: 67.80, vat: 11.30, business_purpose: 'Client lunch with Vandelay Industries', billable: true, client_name: 'Vandelay Industries', client_reference: 'VDL-100' },
      { expense_type: 'entertainment', supplier: 'Pizza Express', date: dateOnly(3), amount: 42.50, vat: 7.08, business_purpose: 'Team lunch with visiting partner' },
    ],
    comments: [
      { userId: manager.id, message: 'Approved. Please ensure receipt for Wagamama is legible.', daysAgo: 2, hour: 14 },
    ],
  });

  await createClaim({
    user: rachel, title: 'Conference swag and printing', status: 'audit', daysAgo: 3,
    manager_id: manager.id,
    items: [
      { expense_type: 'equipment', supplier: 'Vistaprint', date: dateOnly(5), amount: 186.00, vat: 31.00, business_purpose: 'Branded materials for upcoming trade show', project: 'TRADESHOW-Q2' },
      { expense_type: 'equipment', supplier: 'Amazon Business', date: dateOnly(4), amount: 94.50, vat: 15.75, business_purpose: 'Promotional items (pens, USB drives)', project: 'TRADESHOW-Q2' },
    ],
  });

  // ══════════════════════════════════════════════════════════════════
  //  APPROVED  (waiting for processor to pick up)
  // ══════════════════════════════════════════════════════════════════

  await createClaim({
    user: lisa, title: 'Bristol sales visit', status: 'approved', daysAgo: 2,
    manager_id: manager.id,
    items: [
      { expense_type: 'travel', supplier: 'GWR', date: dateOnly(3), amount: 54.20, vat: 0, business_purpose: 'Train to Bristol Temple Meads' },
      { expense_type: 'subsistence', supplier: 'Nando\'s', date: dateOnly(3), amount: 15.90, vat: 2.65, business_purpose: 'Lunch during sales visit' },
      { type: 'mileage', date: dateOnly(3), from_location: 'Bristol Temple Meads', to_location: 'Client Office, Clifton', vehicle_type: 'car', distance: 8, reimbursement_amount: 3.60, business_purpose: 'Taxi alternative — drove rental from station' },
    ],
  });

  await createClaim({
    user: mark, title: 'Tech meetup hosting costs', status: 'approved', daysAgo: 2,
    manager_id: manager.id,
    items: [
      { expense_type: 'entertainment', supplier: 'Domino\'s Pizza', date: dateOnly(3), amount: 78.00, vat: 13.00, business_purpose: 'Catering for monthly tech meetup (28 attendees)' },
      { expense_type: 'equipment', supplier: 'Ryman', date: dateOnly(3), amount: 12.50, vat: 2.08, business_purpose: 'Name badges and markers for meetup' },
    ],
  });

  // ══════════════════════════════════════════════════════════════════
  //  MANAGER REVIEW  (manager needs to action these)
  // ══════════════════════════════════════════════════════════════════

  await createClaim({
    user: david, title: 'Cloud infrastructure training', status: 'manager_review', daysAgo: 1,
    manager_id: manager.id,
    items: [
      { expense_type: 'travel', supplier: 'Trainline', date: dateOnly(2), amount: 42.00, vat: 0, business_purpose: 'Train to Manchester for AWS training course' },
      { expense_type: 'accommodation', supplier: 'Travelodge Manchester', date: dateOnly(2), amount: 69.99, vat: 11.67, business_purpose: 'Overnight for 2-day training' },
      { expense_type: 'subsistence', supplier: 'Various', date: dateOnly(2), amount: 24.30, vat: 4.05, business_purpose: 'Meals during training' },
    ],
  });

  await createClaim({
    user: priya, title: 'Office supplies — ops team', status: 'manager_review', daysAgo: 1,
    manager_id: manager.id,
    items: [
      { expense_type: 'equipment', supplier: 'Staples', date: dateOnly(2), amount: 156.40, vat: 26.07, business_purpose: 'Printer cartridges, paper, filing supplies for ops team' },
    ],
    comments: [
      { userId: priya.id, message: 'Urgent — team running low on printer supplies for month-end reports.', daysAgo: 1, hour: 9 },
    ],
  });

  await createClaim({
    user: tom, title: 'Client dinner — Initech renewal', status: 'manager_review', daysAgo: 0,
    manager_id: manager.id,
    items: [
      { expense_type: 'entertainment', supplier: 'The Wolseley', date: dateOnly(1), amount: 234.00, vat: 39.00, business_purpose: 'Client relationship dinner — contract renewal discussion', billable: true, client_name: 'Initech', client_reference: 'INT-2026-04' },
      { expense_type: 'travel', supplier: 'Uber', date: dateOnly(1), amount: 18.50, vat: 3.08, business_purpose: 'Taxi to restaurant and return' },
    ],
  });

  // ══════════════════════════════════════════════════════════════════
  //  SUBMITTED  (not yet picked up by manager)
  // ══════════════════════════════════════════════════════════════════

  await createClaim({
    user: emma, title: 'Keyboard and peripherals', status: 'submitted', daysAgo: 0,
    items: [
      { expense_type: 'equipment', supplier: 'Apple Store', date: dateOnly(1), amount: 199.00, vat: 33.17, business_purpose: 'Magic Keyboard with Touch ID for dev workstation' },
      { expense_type: 'equipment', supplier: 'Amazon', date: dateOnly(1), amount: 49.99, vat: 8.33, business_purpose: 'USB-C hub for laptop docking' },
    ],
  });

  await createClaim({
    user: sam, title: 'Warehouse safety boots', status: 'submitted', daysAgo: 0,
    items: [
      { expense_type: 'equipment', supplier: 'Screwfix', date: dateOnly(1), amount: 42.99, vat: 7.17, business_purpose: 'Safety boots — required PPE for warehouse visits' },
    ],
  });

  // ══════════════════════════════════════════════════════════════════
  //  DRAFT  (work in progress)
  // ══════════════════════════════════════════════════════════════════

  await createClaim({
    user: employee, title: 'Week commencing 7 April', status: 'draft', daysAgo: 0,
    items: [
      { expense_type: 'travel', supplier: 'Uber', date: dateOnly(0), amount: 14.80, vat: 2.47, business_purpose: 'Taxi to office — rail replacement bus' },
    ],
  });

  await createClaim({
    user: jane, title: 'Social media ad spend — April', status: 'draft', daysAgo: 0,
    items: [
      { expense_type: 'entertainment', supplier: 'Meta Business', date: dateOnly(2), amount: 250.00, vat: 41.67, business_purpose: 'Instagram promoted post for spring campaign', project: 'SPRING-2026', payment_type: 'company_card' },
      { expense_type: 'entertainment', supplier: 'Google Ads', date: dateOnly(1), amount: 150.00, vat: 25.00, business_purpose: 'Google PPC — spring campaign', project: 'SPRING-2026', payment_type: 'company_card' },
    ],
  });

  await createClaim({
    user: rachel, title: 'Team away day expenses', status: 'draft', daysAgo: 0,
    items: [
      { expense_type: 'entertainment', supplier: 'Go Ape', date: dateOnly(0), amount: 210.00, vat: 35.00, business_purpose: 'Team building activity (7 people)', project: 'TEAM-BUILDING' },
      { expense_type: 'subsistence', supplier: 'The Plough Inn', date: dateOnly(0), amount: 165.00, vat: 27.50, business_purpose: 'Team lunch after activity', project: 'TEAM-BUILDING' },
    ],
  });

  // ══════════════════════════════════════════════════════════════════
  //  EXTRA NOTIFICATIONS  (make the bell icon look lively)
  // ══════════════════════════════════════════════════════════════════

  const unreadNotifs = [
    { user_id: manager.id, message: 'New claim submitted: "Cloud infrastructure training" from David Okafor', daysAgo: 1 },
    { user_id: manager.id, message: 'New claim submitted: "Office supplies — ops team" from Priya Patel', daysAgo: 1 },
    { user_id: manager.id, message: 'New claim submitted: "Client dinner — Initech renewal" from Tom Williams', daysAgo: 0 },
    { user_id: processor.id, message: '2 approved claims are ready for audit review', daysAgo: 1 },
    { user_id: processor.id, message: 'Batch "April 2026 — Week 2" has 2 claims ready for export', daysAgo: 0 },
    { user_id: employee.id, message: 'Your claim "April client lunches" is under audit review', daysAgo: 2 },
    { user_id: lisa.id, message: 'Your claim "Bristol sales visit" has been approved by Sarah Manager', daysAgo: 1 },
    { user_id: mark.id, message: 'Your claim "Tech meetup hosting costs" has been approved by Sarah Manager', daysAgo: 1 },
  ];

  for (const n of unreadNotifs) {
    await knex('notifications').insert({
      user_id: n.user_id,
      message: n.message,
      read: false,
      created_at: d(n.daysAgo, 10, 30),
    });
  }

  // Read notifications (history)
  const readNotifs = [
    { user_id: employee.id, message: 'Your claim "London client meeting — March" has been exported', daysAgo: 17 },
    { user_id: lisa.id, message: 'Your claim "Q1 sales conference — Birmingham" has been exported', daysAgo: 15 },
    { user_id: mark.id, message: 'Your claim "Dev equipment — monitor" has been exported', daysAgo: 13 },
    { user_id: jane.id, message: 'Your claim "Marketing photoshoot supplies" has been exported', daysAgo: 7 },
    { user_id: tom.id, message: 'Your claim "Edinburgh client onboarding trip" has been exported', daysAgo: 6 },
    { user_id: david.id, message: 'Your claim "AWS Summit London" has been exported', daysAgo: 5 },
    { user_id: manager.id, message: 'You approved 3 claims this week', daysAgo: 7 },
    { user_id: processor.id, message: 'Batch "March 2026 — Week 4" exported successfully (4 claims)', daysAgo: 14 },
    { user_id: processor.id, message: 'Batch "April 2026 — Week 1" exported successfully (3 claims)', daysAgo: 5 },
  ];

  for (const n of readNotifs) {
    await knex('notifications').insert({
      user_id: n.user_id,
      message: n.message,
      read: true,
      created_at: d(n.daysAgo, 16, 0),
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  ALERTS  (a couple of realistic policy flags)
  // ══════════════════════════════════════════════════════════════════

  // Find the draft claim with the high ad spend
  const adClaim = await knex('claims').where({ title: 'Social media ad spend — April' }).first();
  if (adClaim) {
    const adItems = await knex('claim_items').where({ claim_id: adClaim.id });
    for (const item of adItems) {
      await knex('alerts').insert({
        claim_id: adClaim.id,
        claim_item_id: item.id,
        type: 'missing_receipt',
        severity: 'warning',
        message: `No receipt uploaded for ${item.supplier} (${item.expense_type})`,
        resolved: false,
      });
    }
  }

  // The Wolseley dinner is over policy
  const dinnerClaim = await knex('claims').where({ title: 'Client dinner — Initech renewal' }).first();
  if (dinnerClaim) {
    await knex('alerts').insert({
      claim_id: dinnerClaim.id,
      type: 'policy_violation',
      severity: 'warning',
      message: 'Single entertainment expense exceeds recommended limit (£200). Manager approval may be required.',
      resolved: false,
    });
  }

  // Team away day — missing receipts on draft
  const awayDayClaim = await knex('claims').where({ title: 'Team away day expenses' }).first();
  if (awayDayClaim) {
    const awayItems = await knex('claim_items').where({ claim_id: awayDayClaim.id });
    for (const item of awayItems) {
      await knex('alerts').insert({
        claim_id: awayDayClaim.id,
        claim_item_id: item.id,
        type: 'missing_receipt',
        severity: 'warning',
        message: `No receipt attached for ${item.supplier}`,
        resolved: false,
      });
    }
  }

  console.log('');
  console.log('Demo data seeded successfully!');
  console.log('  8 additional employees created');
  console.log('  ~25 claims across all workflow stages');
  console.log('  3 batches (2 exported, 1 in progress)');
  console.log('  Audit trails, comments, notifications, and alerts populated');
  console.log('');
  console.log('Additional logins (all use password "password"):');
  console.log('  mark.t@example.com      (Engineering)');
  console.log('  lisa.chen@example.com    (Sales)');
  console.log('  david.o@example.com      (Engineering)');
  console.log('  priya.p@example.com      (Operations)');
  console.log('  tom.w@example.com        (Sales)');
  console.log('  rachel.g@example.com     (Marketing)');
  console.log('  sam.h@example.com        (Operations)');
  console.log('  emma.c@example.com       (Engineering)');
};
