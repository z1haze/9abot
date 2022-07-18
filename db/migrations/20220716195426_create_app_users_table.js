/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('app_users', (table) => {
    table.string('user_id').primary();
    table.string('username');
    table.string('discriminator');
    table.string('avatar_url');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
  return knex.schema.dropTable('app_users');
};
