exports.up = function (knex) {
  return knex.schema.createTable('batches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.uuid('processor_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamp('exported_at');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('batches');
};
