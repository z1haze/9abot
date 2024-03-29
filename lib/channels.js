const {ChannelType} = require('discord.js');

const knex = require('../db/knex');
const dbCache = require('../db/cache');

/**
 * Add a new channel in the db
 * @param channel
 * @returns {Promise<*>}
 */
async function addChannel(channel) {
    return knex('discord_channels').insert({
        guild_id: channel.guild.id,
        channel_id: channel.id,
        name: channel.name,
        type: channel.type,
    })
        .then((res) => {
            dbCache.channels.add(channel.id);

            return res;
        });
}

/**
 * Update channel in db
 * @param channel
 * @returns {Promise<*>}
 */
function updateChannel(channel) {
    return knex('discord_channels')
        .where('channel_id', channel.id)
        .andWhere('guild_id', channel.guild.id)
        .update({
            name: channel.name,
            type: channel.type,
        });
}

/**
 * Delete a channel from the db
 * @param channel
 * @returns {Promise<*>}
 */
function deleteChannel(channel) {
    return knex('discord_channels')
        .where('channel_id', channel.id)
        .andWhere('guild_id', channel.guild.id)
        .update({deleted_at: new Date().toISOString()})
        .then((res) => {
            dbCache.channels.delete(channel.id);

            return res;
        });
}

/**
 * Handle syncing channels from discord to database on startup
 * @param guild
 * @returns {Promise<void>}
 */
async function syncChannels(guild) {
    const start = Date.now();

    const dbChannels = await knex('discord_channels')
        .where('guild_id', guild.id);

    const channelsToDelete = new Set(dbChannels.map((channel) => channel.channel_id));

    channelsToDelete.forEach((channelId) => dbCache.channels.add(channelId));

    const dbChannelsMap = new Map(dbChannels.map((channel) => [channel.channel_id, channel]));

    guild.channels.cache.each(async (channel) => {
        if (!(channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice)) {
            return;
        }

        if (!dbChannelsMap.has(channel.id)) {
            await addChannel(channel);
        } else {
            // remove the role from the set so they won't be deleted
            channelsToDelete.delete(channel.id);

            // update role that already exists in db
            await updateChannel(channel);
        }
    });

    // delete roles that were deleted while the bot was down
    if (channelsToDelete.size > 0) {
        await knex('discord_channels')
            .delete()
            .whereIn(['channel_id', 'guild_id'], Array.from(channelsToDelete).map((roleId) => [roleId, guild.id]));
    }

    // eslint-disable-next-line no-console
    console.log(`Syncing channels for ${guild.id} took ${Date.now() - start}ms`);
}

module.exports = {
    addChannel,
    updateChannel,
    deleteChannel,
    syncChannels,
};
