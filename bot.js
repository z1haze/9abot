require('dotenv').config();

const knex = require('./db/knex');
const { client } = require('./constants');

const {
  addRole, updateRole, deleteRole, syncRoles,
} = require('./lib/roles');

const { syncUsers, addUser, syncUserRoles } = require('./lib/users');
const { handleJoinVoice, handleLeaveVoice } = require('./lib/voice');

const guildIds = process.env.GUILD_IDS.split(',');

client.on('ready', async () => {
  // eslint-disable-next-line no-console
  console.log(`Logged in as ${client.user.tag}!`);

  let queue = [];

  // queue discord cache updates
  guildIds.forEach((guildId) => {
    const guild = client.guilds.cache.get(guildId);

    queue.push(guild.roles.fetch());
    queue.push(guild.members.fetch());
  });

  // await discord cache updates
  await Promise.all(queue);

  // clear queue
  queue = [];

  // queue syncing roles and users with our database
  guildIds.forEach((guildId) => {
    const guild = client.guilds.cache.get(guildId);

    queue.push(syncRoles(guild));
    queue.push(syncUsers(guild));
  });

  // await database sync
  await Promise.all(queue);
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
    await knex('discord_users')
      .where('user_id', guildMember.user.id)
      .andWhere('guild_id', guildMember.guild.id)
      .update({
        username: guildMember.user.username,
        discriminator: guildMember.user.discriminator,
        nickname: guildMember.nickname,
        quit_timestamp: null,
        is_bot: guildMember.user.bot,
      });
  } else {
    // add a net new user
    await addUser(guildMember, guildMember.guild.id);
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
    console.log(`${oldUser.username} was updated.`);
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
    console.log(`${oldGuildMember.displayName} was updated.`);
  }
});

/**
 * When a user leaves the guild
 */
client.on('guildMemberRemove', async (guildMember) => {
  // eslint-disable-next-line no-console
  console.log(`${guildMember.displayName} left the server`);

  await knex('discord_users')
    .update({ quit_timestamp: new Date().toISOString() })
    .where('user_id', guildMember.user.id)
    .andWhere('guild_id', guildMember.guild.id);
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
 * Collect voice sessions
 */
client.on('voiceStateUpdate', async (before, after) => {
  if (before.channelId === after.channelId) {
    return;
  }

  if (before.channelId) {
    await handleLeaveVoice(before.member, before.channel);
  }

  if (after.channelId) {
    await handleJoinVoice(after.member, after.channel);
  }
});

client.login(process.env.BOT_TOKEN);
