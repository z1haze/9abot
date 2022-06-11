/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_voice_sessions', (table) => {
    table.increments('voice_session_id').primary();
    table.string('user_id');
    table.string('voice_channel_id');
    table.string('guild_id');
    table.timestamp('time_join');
    table.timestamp('time_leave');
    table.timestamps(true, true);

    table.foreign(['user_id', 'guild_id'])
      .references(['user_id', 'guild_id'])
      .inTable('discord_users');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function up(knex) {
  return knex.schema.dropTable('discord_voice_sessions');
};
