require('dotenv').config();

const { Client, Intents } = require('discord.js');
const User = require('./models/user');
const { syncUsers, addUser } = require('./lib/users');
const { handleJoinVoice, handleLeaveVoice } = require('./lib/voice');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});
const guildIds = process.env.GUILD_IDS.split(',');

client.on('ready', async () => {
  // eslint-disable-next-line no-console
  console.log(`Logged in as ${client.user.tag}!`);

  let promises = [];

  // update roles and
  guildIds.forEach((guildId) => {
    const guild = client.guilds.cache.get(guildId);

    promises.push(guild.members.fetch());
  });

  await Promise.all(promises);

  promises = [];

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

  const existingUser = await User.query().findById([guildMember.user.id, guildMember.guild.id]);

  if (existingUser) {
    // handle a user who joins who has already joined in the past
    await existingUser.$query().patch({
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
 * When a guild member updates
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

  // if we're tracking any changes
  if (Object.keys(changes).length > 0) {
    await User.query().patch(changes).findById([newGuildMember.user.id, newGuildMember.guild.id]);

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

  await User.query().patch({ quit_timestamp: new Date().toISOString() })
    .findById([guildMember.id, guildMember.guild.id]);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

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
