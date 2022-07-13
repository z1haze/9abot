const knex = require('../db/knex');

function addUser(guildMember) {
  return knex('discord_users').insert({
    guild_id: guildMember.guild.id,
    user_id: guildMember.user.id,
    username: guildMember.user.username,
    discriminator: guildMember.user.discriminator,
    nickname: guildMember.nickname,
    avatar_url: guildMember.displayAvatarURL(),
    is_bot: guildMember.user.bot,
    joined_timestamp: new Date(guildMember.joinedTimestamp).toISOString(),
  });
}

async function syncUserRoles(guildMember, dbUser = null) {
  // const start = Date.now();
  const roles = guildMember.roles.cache;

  if (dbUser) {
    await knex('discord_roles_users')
      .where('user_id', dbUser.user_id)
      .andWhere('guild_id', guildMember.guild.id)
      .del();
  }

  // build the user roles
  const entries = roles.map((role) => ({
    guild_id: guildMember.guild.id,
    role_id: role.id,
    user_id: guildMember.id,
  }));

  return knex('discord_roles_users').insert(entries);

  // console.log(`Syncing Roles For ${guildMember.displayName} took ${Date.now() - start}ms`);
}

async function syncUsers(guild) {
  const dbUsers = await knex('discord_users')
    .whereNull('quit_timestamp')
    .andWhere('guild_id', guild.id);

  const usersWhoQuit = new Set(dbUsers.map((user) => user.user_id));
  const dbUsersMap = new Map(dbUsers.map((user) => [user.user_id, user]));
  let queue = [];

  /**
   * If a user exists in the guild, but does not exist in the db, add them to the db,
   * otherwise remove them from the usersWhoQuit Set so they will not be marked as quit
   *
   * Build queue to add new users to db
   */
  guild.members.cache.each(async (guildMember) => {
    if (!dbUsersMap.has(guildMember.user.id)) {
      queue.push(addUser(guildMember));
    } else {
      usersWhoQuit.delete(guildMember.user.id);
    }
  });

  // await new users being added to db
  await Promise.all(queue);

  // clear queue
  queue = [];

  // eslint-disable-next-line max-len
  guild.members.cache.each(async (guildMember) => queue.push(syncUserRoles(guildMember, dbUsersMap.get(guildMember.user.id))));

  // await user's roles update
  await Promise.all(queue);

  if (usersWhoQuit.size > 0) {
    // flag users who quit with a quit timestamp, and remove their member status
    await knex('discord_users')
      .update({ quit_timestamp: new Date().toISOString() })
      .whereIn(['guild_id', 'user_id'], Array.from(usersWhoQuit).map((userId) => [guild.id, userId]));

    // delete user's roles
    await knex('discord_roles_users').whereIn(['user_id', 'guild_id'], Array.from(usersWhoQuit).map((userId) => [userId, guild.id])).del();
  }

  // eslint-disable-next-line no-console
  console.log(`Synced guild ${guild.id} users`);
}

module.exports = {
  syncUsers,
  addUser,
  syncUserRoles,
};
