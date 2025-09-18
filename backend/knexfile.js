require('dotenv').config();

const {
  DB_CLIENT = 'pg',
  DATABASE_URL,
  PG_HOST = '127.0.0.1',
  PG_PORT = '5432',
  PG_USER = 'app',
  PG_PASSWORD = 'app',
  PG_DATABASE = 'identity',
} = process.env;

const pg = {
  client: 'pg',
  connection: DATABASE_URL || {
    host: PG_HOST,
    port: Number(PG_PORT),
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
  },
  pool: { min: 0, max: 10 },
  migrations: { tableName: 'knex_migrations', directory: './migrations' },
};

module.exports = {
  development: pg,
  production: pg,
};
