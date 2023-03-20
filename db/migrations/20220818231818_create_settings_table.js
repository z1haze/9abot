/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function up(knex) {
    return knex.schema.createTable('settings', (table) => {
        table.string('guild_id').primary();
        table.json('value');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.down = function down(knex) {
    return knex.schema.dropTable('settings');
};
