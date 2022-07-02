require('dotenv').config();

const knex = require('./db/knex');
const { client } = require('./constants');
const { syncUsers, addUser } = require('./lib/users');
const { handleJoinVoice, handleLeaveVoice } = require('./lib/voice');

const guildIds = process.env.GUILD_IDS.split(',');

client.on('ready', async () => {
  // eslint-disable-next-line no-console
  console.log(`Logged in as ${client.user.tag}!`);

  let promises = [];

  // update discord members cache
  guildIds.forEach((guildId) => {
    const guild = client.guilds.cache.get(guildId);
    promises.push(guild.members.fetch());
  });

  await Promise.all(promises);

  promises = [];

  // sync users for each guild
  guildIds.forEach((guildId) => {
    const guild = client.guilds.cache.get(guildId);
    promises.push(syncUsers(guild));
  });

  await Promise.all(promises);
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
client.on('guildMemberUpdate', async (oldGuildMember, newGuildMember) => {
  const changes = {};

  // username change
  if (oldGuildMember.user.username !== newGuildMember.user.username) {
    changes.username = newGuildMember.user.username;
  }

  // discriminator change
  if (oldGuildMember.user.discriminator !== newGuildMember.user.discriminator) {
    changes.discriminator = newGuildMember.user.discriminator;
  }

  // nickname change
  if (oldGuildMember.nickname !== newGuildMember.nickname) {
    changes.nickname = newGuildMember.nickname;
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

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
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
