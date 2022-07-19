/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_channels', (table) => {
    table.string('guild_id');
    table.string('channel_id');
    table.primary(['guild_id', 'channel_id']);

    table.string('name');
    table.string('type');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
  return knex.schema.dropTable('discord_channels');
};
