exports.up = function (knex) {
  return knex.schema.alterTable('claim_items', (t) => {
    t.string('client_name');
    t.string('client_reference');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('claim_items', (t) => {
    t.dropColumn('client_name');
    t.dropColumn('client_reference');
  });
};
