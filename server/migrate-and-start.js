const knex = require('knex');
const config = require('./db/knexfile');

const env = process.env.NODE_ENV || 'development';

knex(config[env]).migrate.latest()
  .then(() => {
    console.log('Migrations complete');
    require('./index.js');
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
