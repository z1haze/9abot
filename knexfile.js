require('dotenv').config();

const config = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    },
    pool: {
        min: 2,
        max: 10,
    },
    migrations: {
        tableName: 'migrations',
        directory: './db/migrations',
    },
    seeds: {
        directory: './db/seeds',
    },
};

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
    development: config,
    production: config,
};
