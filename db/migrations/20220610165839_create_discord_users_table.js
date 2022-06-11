/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_users', (table) => {
    table.string('user_id');
    table.string('username');
    table.string('discriminator');
    table.string('nickname').nullable();
    table.string('guild_id');
    table.boolean('is_bot').defaultTo(false);
    table.timestamp('joined_timestamp');
    table.timestamp('quit_timestamp').nullable();
    table.timestamps(true, true);

    table.primary(['user_id', 'guild_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function up(knex) {
  return knex.schema.dropTable('discord_users');
};
