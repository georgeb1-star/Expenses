exports.up = function (knex) {
  return knex.schema.createTable('claim_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('claim_id').notNullable().references('id').inTable('claims').onDelete('CASCADE');
    t.enum('type', ['expense', 'mileage']).notNullable();
    t.string('expense_type');
    t.string('supplier');
    t.date('transaction_date').notNullable();
    t.decimal('amount', 10, 2).defaultTo(0);
    t.decimal('vat', 10, 2).defaultTo(0);
    t.string('currency', 3).defaultTo('GBP');
    t.string('payment_type');
    t.text('business_purpose');
    t.string('department');
    t.string('project');
    t.boolean('billable').defaultTo(false);
    // Mileage fields
    t.string('from_location');
    t.string('to_location');
    t.string('vehicle_type');
    t.decimal('distance', 8, 2);
    t.integer('passengers');
    t.decimal('reimbursement_amount', 10, 2);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('claim_items');
};
