const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  await knex('notifications').del();
  await knex('audit_logs').del();
  await knex('alerts').del();
  await knex('comments').del();
  await knex('attendees').del();
  await knex('receipts').del();
  await knex('claim_items').del();
  await knex('claims').del();
  await knex('batches').del();
  await knex('users').del();

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const [admin] = await knex('users').insert({
    name: 'Admin User',
    email: 'admin@example.com',
    password_hash: hash('password'),
    role: 'admin',
    department: 'IT',
    employee_id: 'EMP001',
  }).returning('*');

  const [manager] = await knex('users').insert({
    name: 'Sarah Manager',
    email: 'manager@example.com',
    password_hash: hash('password'),
    role: 'manager',
    department: 'Operations',
    employee_id: 'EMP002',
  }).returning('*');

  const [processor] = await knex('users').insert({
    name: 'Finance Processor',
    email: 'processor@example.com',
    password_hash: hash('password'),
    role: 'processor',
    department: 'Finance',
    employee_id: 'EMP003',
  }).returning('*');

  await knex('users').insert({
    name: 'John Employee',
    email: 'employee@example.com',
    password_hash: hash('password'),
    role: 'employee',
    department: 'Sales',
    employee_id: 'EMP004',
    manager_id: manager.id,
  });

  await knex('users').insert({
    name: 'Jane Smith',
    email: 'jane@example.com',
    password_hash: hash('password'),
    role: 'employee',
    department: 'Marketing',
    employee_id: 'EMP005',
    manager_id: manager.id,
  });

  console.log('Seeded test users:');
  console.log('  admin@example.com / password (admin)');
  console.log('  manager@example.com / password (manager)');
  console.log('  processor@example.com / password (processor)');
  console.log('  employee@example.com / password (employee)');
  console.log('  jane@example.com / password (employee)');
};
