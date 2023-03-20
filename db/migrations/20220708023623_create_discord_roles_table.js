/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
    return knex.schema.createTable('discord_roles', (table) => {
        table.string('guild_id');
        table.string('role_id');
        table.primary(['guild_id', 'role_id']);

        table.string('name');
        table.string('color', 7);
        table.integer('position');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
    return knex.schema.dropTable('discord_roles');
};
