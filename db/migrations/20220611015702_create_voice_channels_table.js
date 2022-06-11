/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_voice_channels', (table) => {
    table.string('voice_channel_id').primary();
    table.string('voice_channel_name');
    table.string('guild_id');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function up(knex) {
  return knex.schema.dropTable('discord_voice_channels');
};
