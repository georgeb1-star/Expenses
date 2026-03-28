exports.up = function (knex) {
  return knex.schema.createTable('receipts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('claim_item_id').notNullable().references('id').inTable('claim_items').onDelete('CASCADE');
    t.string('filename').notNullable();
    t.string('mime_type').notNullable();
    t.specificType('data', 'bytea').notNullable();
    t.timestamp('uploaded_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('receipts');
};
