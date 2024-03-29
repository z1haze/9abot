/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
    return knex.schema.table('discord_roles', (table) => {
        table.timestamp('deleted_at');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
    return knex.schema.table('discord_roles', (table) => {
        table.dropColumn('deleted_at');
    });
};
