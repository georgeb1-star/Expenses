exports.up = function (knex) {
  return knex.schema.createTable('alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('claim_id').notNullable().references('id').inTable('claims').onDelete('CASCADE');
    t.uuid('claim_item_id').references('id').inTable('claim_items').onDelete('CASCADE');
    t.string('type').notNullable(); // missing_receipt | policy_violation | duplicate | missing_field
    t.enum('severity', ['error', 'warning']).notNullable();
    t.text('message').notNullable();
    t.boolean('resolved').defaultTo(false);
    t.timestamp('resolved_at');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('alerts');
};
