/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
    return knex.schema.createTable('discord_roles_users', (table) => {
        table.string('guild_id');
        table.string('role_id');
        table.string('user_id');
        table.primary(['guild_id', 'role_id', 'user_id']);

        table.foreign(['guild_id', 'role_id']).references(['guild_id', 'role_id']).inTable('discord_roles').onDelete('CASCADE');
        table.foreign(['guild_id', 'user_id']).references(['guild_id', 'user_id']).inTable('discord_users').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
    return knex.schema.dropTable('discord_roles_users');
};
