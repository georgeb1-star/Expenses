exports.up = function (knex) {
  return knex.schema.createTable('attendees', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('claim_item_id').notNullable().references('id').inTable('claim_items').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('company');
    t.decimal('amount', 10, 2);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('attendees');
};
