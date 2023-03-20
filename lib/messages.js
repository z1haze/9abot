const knex = require('../db/knex');
const dbCache = require('../db/cache');
const {addChannel} = require('./channels');

/**
 * Add a message to the database
 * @param message
 * @returns {Promise<*>}
 */
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

/**
 * Delete a message from the database
 * @param message
 * @returns {Promise<*>}
 */
function deleteMessage(message) {
    return knex('discord_messages')
        .where('message_id', message.id)
        .del();
}

module.exports = {
    addMessage,
    deleteMessage,
};
