/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_voice_channels', (table) => {
    table.string('guild_id');
    table.string('voice_channel_id');
    table.primary(['guild_id', 'voice_channel_id']);

    table.string('voice_channel_name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
  return knex.schema.dropTable('discord_voice_channels');
};
