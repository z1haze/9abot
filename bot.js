const {ChannelType, Collection} = require('discord.js');

require('dotenv').config();

const knex = require('./db/knex');
const {client} = require('./constants');
const {init: initSentry} = require('./log/sentry');

const dbCache = require('./db/cache');
const {addRole, updateRole, deleteRole, syncRoles} = require('./lib/roles');
const {syncUsers, addUser, updateUser, deleteUser, syncUserRoles} = require('./lib/users');
const {handleJoinVoice, handleLeaveVoice} = require('./lib/voice');
const {addMessage, deleteMessage} = require('./lib/messages');
const {addChannel, syncChannels, updateChannel, deleteChannel} = require('./lib/channels');
const {syncStats, getSettings} = require('./lib/util');

initSentry();

let invites = new Collection();

/**
 * Handle startup of bot
 */
client.on('ready', async () => {
    // eslint-disable-next-line no-console
    console.log(`Logged in as ${client.user.tag}!`);

    dbCache.me = client.user;

    let queue = [];

    await client.guilds.fetch();

    // queue discord cache updates
    client.guilds.cache.each((guild) => {
        queue.push(guild.roles.fetch());
        queue.push(guild.members.fetch({withPresences: true}));
        queue.push(guild.channels.fetch());
        queue.push(guild.invites.fetch());
    });

    // await discord cache updates
    await Promise.all(queue);

    // clear queue
    queue = [];

    // queue syncing roles, roles, and channels with our database
    client.guilds.cache.each(async (guild) => {
        dbCache.settings.set(guild.id, await getSettings(guild));

        queue.push(syncRoles(guild));
        queue.push(syncUsers(guild));
        queue.push(syncChannels(guild));
        queue.push(syncStats(guild));

        if (dbCache.settings.get(guild.id).channelIds.welcome) {
            // store invites in memory
            invites.set(guild.id, new Collection(guild.invites.cache.map((invite) => [invite.code, invite.uses])));
        }

        // eslint-disable-next-line no-eval
        dbCache.statIntervals.set(guild.id, setInterval(syncStats, eval(process.env.STATS_UPDATE_INTERVAL), guild));
    });

    // await database sync
    await Promise.all(queue);
});

/**
 * When an invitation is created
 */
client.on('inviteCreate', (invite) => {
    invites.get(invite.guild.id).set(invite.code, invite.uses);
});

/**
 * When an invitation is deleted
 */
client.on('inviteDelete', (invite) => {
    invites.get(invite.guild.id).delete(invite.code);
});

/**
 * When a new guild is added to the bot
 */
client.on('guildCreate', async (guild) => {
    let queue = [];

    queue.push(guild.roles.fetch());
    queue.push(guild.members.fetch());
    queue.push(guild.channels.fetch());

    if (dbCache.settings.get(guild.id).channelIds.welcome) {
        queue.push(guild.invites.fetch());
    }

    await Promise.all(queue);

    queue = [];

    queue.push(syncRoles(guild));
    queue.push(syncUsers(guild));
    queue.push(syncChannels(guild));

    if (dbCache.settings.get(guild.id).channelIds.welcome) {
        // store invites in memory
        invites.set(guild.id, new Collection(guild.invites.cache.map((invite) => [invite.code, invite.uses])));
    }

    // eslint-disable-next-line no-eval
    dbCache.statIntervals.set(guild.id, setInterval(syncStats, eval(process.env.STATS_UPDATE_INTERVAL), guild));

    await Promise.all(queue);
});

/**
 * When the client is removed from a guild
 */
client.on('guildDelete', (guild) => {
    // eslint-disable-next-line no-console
    console.log(`Guild (${guild.id}) removed client.`);

    // remove invites from memory
    invites.delete(guild.id);

    clearInterval(dbCache.statIntervals.get(guild.id));
});

/**
 * When a channel is created
 */
client.on('channelCreate', async (channel) => {
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
        await addChannel(channel);
    }
});

/**
 * When a channel is updated
 */
client.on('channelUpdate', async (channel) => {
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
        await updateChannel(channel);
    }
});

/**
 * When a channel is deleted
 */
client.on('channelDelete', async (channel) => {
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
        await deleteChannel(channel);
    }
});

/**
 * When a user joins the guild
 */
client.on('guildMemberAdd', async (guildMember) => {
    // eslint-disable-next-line no-console
    console.log(`${guildMember.displayName} joined the server`);

    // find user already existing in db
    const existingUser = await knex('discord_users')
        .where('user_id', guildMember.user.id)
        .andWhere('guild_id', guildMember.guild.id)
        .limit(1);

    if (existingUser.length) {
        // handle a user who joins who has already joined in the past
        await updateUser(guildMember);
    } else {
        // add a net new user
        await addUser(guildMember, guildMember.guild.id);
    }

    const welcomeChannelId = dbCache.settings.get(guildMember.guild.id).channelIds.welcome;

    // send user joined message
    if (welcomeChannelId) {
        const newInvites = await guildMember.guild.invites.fetch();
        const oldInvites = invites.get(guildMember.guild.id);

        // find the invite that was just incremented
        const invite = newInvites.find((invite) => invite.uses > oldInvites.get(invite.code));

        if (invite) {
            const inviter = await client.users.fetch(invite.inviter.id);
            const logChannel = guildMember.guild.channels.cache.find(channel => channel.id === welcomeChannelId);

            await logChannel.send(`${guildMember.user.username} was invited by ${inviter} using invite code **${invite.code}**.`);
        }
    }
});

/**
 * Handle user updates
 */
client.on('userUpdate', async (oldUser, newUser) => {
    const changes = {};

    // username change
    if (oldUser.username !== newUser.username) {
        changes.username = newUser.username;
    }

    // discriminator change
    if (oldUser.discriminator !== newUser.discriminator) {
        changes.discriminator = newUser.discriminator;
    }

    // avatar change
    if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
        changes.avatar_url = newUser.displayAvatarURL();
    }

    // only update changes we care to track
    if (Object.keys(changes).length > 0) {
        await knex('discord_users').update(changes)
            .where('user_id', newUser.id);

        // eslint-disable-next-line no-console
        console.log(`${oldUser.username} user was updated.`);
    }
});

/**
 * Handle guild member updates
 */
client.on('guildMemberUpdate', async (oldGuildMember, newGuildMember) => {
    const changes = {};

    // nickname change
    if (oldGuildMember.nickname !== newGuildMember.nickname) {
        changes.nickname = newGuildMember.nickname;
    }

    // role assignment change
    if (oldGuildMember.roles.cache.size !== newGuildMember.roles.cache.size) {
        const dbUser = (await knex('discord_users')
            .where('user_id', newGuildMember.id)
            .andWhere('guild_id', newGuildMember.guild.id)
            .limit(1))[0];

        await syncUserRoles(newGuildMember, dbUser);
        // eslint-disable-next-line no-console
        console.log(`${newGuildMember.displayName}'s roles were updated`);
    }

    // only update changes we care to track
    if (Object.keys(changes).length > 0) {
        await knex('discord_users').update(changes)
            .where('user_id', newGuildMember.user.id)
            .andWhere('guild_id', newGuildMember.guild.id);

        // eslint-disable-next-line no-console
        console.log(`${oldGuildMember.displayName} guild member was updated.`);
    }
});

/**
 * When a user leaves the guild
 */
client.on('guildMemberRemove', async (guildMember) => {
    // eslint-disable-next-line no-console
    console.log(`${guildMember.displayName} left the server`);

    await deleteUser(guildMember);
});

/**
 * Handle adding new roles to the database
 */
client.on('roleCreate', async (role) => {
    // eslint-disable-next-line no-console
    console.log(`${role.name} (${role.id}) was created.`);

    await addRole(role, role.guild.id);
});

/**
 * Handle updating a role in the database
 */
client.on('roleUpdate', async (oldRole, newRole) => {
    // eslint-disable-next-line no-console
    console.log(`Role ${newRole.name} (${oldRole.id}) was updated.`);

    await updateRole(newRole);
});

/**
 * Handle deleting a role from the database
 */
client.on('roleDelete', async (role) => {
    // eslint-disable-next-line no-console
    console.log(`Role ${role.name} (${role.id}) was deleted.`);

    await deleteRole(role);
});

/**
 * Handle adding messages to the database
 */
client.on('messageCreate', async (message) => {
    await addMessage(message);
});

/**
 * Handle adding messages to the database
 */
client.on('messageDelete', async (message) => {
    await deleteMessage(message);
});

/**
 * Collect voice sessions
 */
client.on('voiceStateUpdate', async (before, after) => {
    if (before.channelId === after.channelId) {
        return;
    }

    if (before.channelId) {
        await handleLeaveVoice(before);
    }

    if (after.channelId) {
        await handleJoinVoice(after);
    }
});

client.login(process.env.BOT_TOKEN);
