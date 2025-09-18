const knexLib = require('knex');
const config = require('../knexfile');
const env = process.env.NODE_ENV || 'development';
const knex = knexLib(config[env]);
module.exports = knex;