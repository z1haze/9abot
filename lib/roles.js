const knex = require('../db/knex');

/**
 * Add a new role to the database
 *
 * @param role
 * @param guildId
 * @returns {Knex.QueryBuilder<{discord_role_id, discord_role_name, discord_role_position}, number[]>}
 */
function addRole(role) {
  return knex('discord_roles').insert([{
    guild_id: role.guild.id,
    role_id: role.id,
    name: role.name,
    color: role.hexColor,
    position: role.position,
  }]);
}

/**
 * Update role in db
 * @param role
 * @returns {Knex.QueryBuilder<TRecord, TResult>}
 */
function updateRole(role) {
  return knex('discord_roles').update({
    name: role.name,
    color: role.hexColor,
    position: role.position,
  })
    .where('role_id', role.id)
    .andWhere('guild_id', role.guild.id);
}

/**
 * Delete role from db
 * @param role
 * @returns {Knex.QueryBuilder<TRecord, number>}
 */
function deleteRole(role) {
  return knex('discord_roles')
    .update({ deleted_at: new Date().toISOString() })
    .where('role_id', role.id)
    .andWhere('guild_id', role.guild.id);
}

/**
 * Handle syncing roles from discord to database on startup
 *
 * @param guild
 * @returns {Promise<void>}
 */
async function syncRoles(guild) {
  const dbRoles = await knex('discord_roles')
    .where('guild_id', guild.id);

  const rolesToDelete = new Set(dbRoles.map((role) => role.role_id));
  const dbRolesMap = new Map(dbRoles.map((role) => [role.role_id, role]));

  guild.roles.cache.each(async (role) => {
    // insert roles which were created while the bot was down
    if (!dbRolesMap.has(role.id)) {
      await addRole(role);
    } else {
      // remove the role from the set so they won't be deleted
      rolesToDelete.delete(role.id);

      // update role that already exists in db
      await updateRole(role);
    }
  });

  // delete roles that were deleted while the bot was down
  if (rolesToDelete.size > 0) {
    await knex('discord_roles')
      .delete()
      .whereIn(['role_id', 'guild_id'], Array.from(rolesToDelete).map((roleId) => [roleId, guild.id]));
  }

  // eslint-disable-next-line no-console
  console.log(`Synced guild ${guild.id} roles`);
}

module.exports = {
  addRole,
  updateRole,
  deleteRole,
  syncRoles,
};
