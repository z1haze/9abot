const config = require('../knexfile');

// eslint-disable-next-line import/order
const knex = require('knex')(config.development);

module.exports = knex;
