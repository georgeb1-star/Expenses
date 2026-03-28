exports.up = function (knex) {
  return knex.schema
    .raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    .createTable('users', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('name').notNullable();
      t.string('email').notNullable().unique();
      t.string('password_hash').notNullable();
      t.enum('role', ['employee', 'manager', 'processor', 'admin']).notNullable().defaultTo('employee');
      t.string('department');
      t.string('employee_id');
      t.uuid('manager_id').references('id').inTable('users').onDelete('SET NULL');
      t.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
