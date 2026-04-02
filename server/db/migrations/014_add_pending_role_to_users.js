exports.up = function (knex) {
  return knex.schema.alterTable('users', (t) => {
    t.string('pending_role', 20).nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (t) => {
    t.dropColumn('pending_role');
  });
};
