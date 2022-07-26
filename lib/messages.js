const knex = require('../db/knex');
const dbCache = require('../db/cache');
const { addChannel } = require('./channels');

async function addMessage(message) {
  if (!dbCache.channels.has(message.channel.id)) {
    await addChannel(message.channel);
  }

  return knex('discord_messages').insert([{
    guild_id: message.guild.id,
    message_id: message.id,
    user_id: message.author.id,
    channel_id: message.channel.id,
    time_sent: message.createdAt.toISOString(),
  }]);
}

function deleteMessage(message) {
  return knex('discord_messages')
    .where('message_id', message.id)
    .andWhere('guild_id', message.guild.id)
    .del();
}

module.exports = {
  addMessage,
  deleteMessage,
};
