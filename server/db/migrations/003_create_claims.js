exports.up = function (knex) {
  return knex.schema.createTable('claims', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.enum('status', [
      'draft',
      'submitted',
      'manager_review',
      'approved',
      'audit',
      'processing',
      'exported',
    ]).notNullable().defaultTo('draft');
    t.timestamp('submitted_at');
    t.uuid('manager_id').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approved_at');
    t.uuid('batch_id').references('id').inTable('batches').onDelete('SET NULL');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('claims');
};
