/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
  return knex.schema.createTable('discord_messages', (table) => {
    table.string('guild_id');
    table.string('message_id');
    table.string('user_id');
    table.string('channel_id');
    table.timestamp('time_sent');

    table.foreign(['guild_id', 'channel_id'])
      .references(['guild_id', 'channel_id'])
      .inTable('discord_channels')
      .onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
  return knex.schema.dropTable('discord_messages');
};
