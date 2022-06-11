require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('vote')
    .setDescription('New member vote commands')
    .addSubcommand((subcommand) => subcommand.setName('open').setDescription('Open a new member vote')
      .addUserOption((option) => option.setName('target').setRequired(true).setDescription('Select a user')))
    .addSubcommand((subcommand) => subcommand.setName('status').setDescription('View the status of a new member vote')
      .addUserOption((option) => option.setName('target').setRequired(true).setDescription('Select a user')))
    .addSubcommand((subcommand) => subcommand.setName('close').setDescription('Close a new member vote')
      .addUserOption((option) => option.setName('target').setRequired(true).setDescription('Select a user'))),
];

(async () => {
  try {
    // eslint-disable-next-line no-console
    console.log('Started refreshing application (/) commands.');

    const promises = [];

    process.env.GUILD_IDS.split(',').forEach((guildId) => {
      promises.push(rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands },
      ));
    });

    await Promise.all(promises);

    // eslint-disable-next-line no-console
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
})();
