/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_users', (table) => {
    table.string('guild_id');
    table.string('user_id');
    table.primary(['guild_id', 'user_id']);

    table.string('username');
    table.string('discriminator');
    table.string('nickname');
    table.string('avatar_url');
    table.boolean('is_bot').defaultTo(false);

    table.timestamp('joined_timestamp');
    table.timestamp('quit_timestamp');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
  return knex.schema.dropTable('discord_users');
};
