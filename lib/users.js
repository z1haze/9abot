const knex = require('../db/knex');
const dbCache = require('../db/cache');

/**
 * Add a new user to the db
 * @param guildMember
 * @returns {Promise<*>}
 */
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
    })
        .then((res) => {
            dbCache.users.get(guildMember.guild.id).add(guildMember.user.id);

            return res;
        });
}

/**
 * Update existing user in db
 * @param guildMember
 * @returns {Promise<*>}
 */
function updateUser(guildMember) {
    const partialRecord = {
        username: guildMember.user.username,
        discriminator: guildMember.user.discriminator,
        nickname: guildMember.nickname,
        avatar_url: guildMember.displayAvatarURL(),
        quit_timestamp: null,
        is_bot: guildMember.user.bot,
    };

    return knex('discord_users').update(partialRecord)
        .where('user_id', guildMember.user.id)
        .andWhere('guild_id', guildMember.guild.id);
}

/**
 * Mark user as deleted in db
 * @param guildMember
 * @returns {Promise<*>}
 */
function deleteUser(guildMember) {
    return knex('discord_users')
        .where('user_id', guildMember.user.id)
        .andWhere('guild_id', guildMember.guild.id)
        .update({quit_timestamp: new Date().toISOString()})
        .then((res) => {
            dbCache.users.get(guildMember.guild.id).delete(guildMember.user.id);

            return res;
        });
}

/**
 * Sync a user's roles to the db
 * @param guildMember
 * @param dbUser
 * @returns {Promise<void>}
 */
async function syncUserRoles(guildMember, dbUser = null) {
    const start = Date.now();
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

    await knex('discord_roles_users').insert(entries);

    // eslint-disable-next-line no-console
    console.log(`Syncing roles for ${guildMember.displayName} took ${Date.now() - start}ms`);
}

/**
 * Sync users with db
 * @param guild
 * @returns {Promise<void>}
 */
async function syncUsers(guild) {
    const start = Date.now();

    const dbUsers = await knex('discord_users')
        .whereNull('quit_timestamp')
        .andWhere('guild_id', guild.id);

    const usersWhoQuit = new Set(dbUsers.map((user) => user.user_id));

    if (!dbCache.users.has(guild.id)) {
        dbCache.users.set(guild.id, new Set());
    }

    const userCache = dbCache.users.get(guild.id);

    usersWhoQuit.forEach((userId) => userCache.add(userId));

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

            // update user that already exists in db
            await updateUser(guildMember);
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
            .update({quit_timestamp: new Date().toISOString()})
            .whereIn(['guild_id', 'user_id'], Array.from(usersWhoQuit).map((userId) => [guild.id, userId]));

        // delete user's roles
        await knex('discord_roles_users').whereIn(['user_id', 'guild_id'], Array.from(usersWhoQuit).map((userId) => [userId, guild.id])).del();
    }

    // eslint-disable-next-line no-console
    console.log(`Syncing users for guild ${guild.id} took ${Date.now() - start}ms`);
}

module.exports = {
    syncUsers,
    addUser,
    updateUser,
    deleteUser,
    syncUserRoles,
};
