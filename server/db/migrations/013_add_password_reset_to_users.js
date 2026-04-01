exports.up = function (knex) {
  return knex.schema.alterTable('users', (t) => {
    t.string('reset_token').nullable();
    t.timestamp('reset_token_expires').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (t) => {
    t.dropColumn('reset_token');
    t.dropColumn('reset_token_expires');
  });
};
