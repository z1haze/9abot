/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_voice_sessions', (table) => {
    table.string('guild_id');
    table.string('voice_session_id');
    table.primary(['guild_id', 'voice_session_id']);

    table.string('user_id');
    table.string('channel_id');
    table.timestamp('time_join');
    table.timestamp('time_leave');

    table.foreign(['guild_id', 'channel_id'])
      .references(['guild_id', 'channel_id'])
      .inTable('discord_channels')
      .onDelete('CASCADE');

    table.foreign(['guild_id', 'user_id'])
      .references(['guild_id', 'user_id'])
      .inTable('discord_users');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
  return knex.schema.dropTable('discord_voice_sessions');
};
