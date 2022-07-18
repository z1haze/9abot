const knex = require('../db/knex');

async function addMessage(message) {
  return knex('discord_messages').insert([{
    guild_id: message.guild.id,
    message_id: message.id,
    user_id: message.author.id,
    text_channel_id: message.channel.id,
    time_sent: message.createdAt.toISOString(),
  }]);
}

module.exports = {
  addMessage,
};
