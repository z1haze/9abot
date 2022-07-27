const knex = require('../db/knex');
const dbCache = require('../db/cache');

/**
 * Add a new channel in the db
 * @param channel
 * @returns {Promise<Knex.QueryBuilder<{guild_id, name, channel_id}, number[]>>}
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
 * @returns {Knex.QueryBuilder<TRecord, TResult>}
 */
function updateChannel(channel) {
  return knex('discord_channels').update({
    name: channel.name,
    type: channel.type,
  })
    .where('channel_id', channel.id)
    .andWhere('guild_id', channel.guild.id);
}

/**
 * Delete a channel from the db
 * @param channel
 * @returns {Knex.QueryBuilder<TRecord, number>}
 */
function deleteChannel(channel) {
  return knex('discord_channels')
    .update({ deleted_at: new Date().toISOString() })
    .where('channel_id', channel.id)
    .andWhere('guild_id', channel.guild.id)
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
  const dbChannels = await knex('discord_channels')
    .where('guild_id', guild.id);

  const channelsToDelete = new Set(dbChannels.map((channel) => channel.channel_id));

  channelsToDelete.forEach((channelId) => dbCache.channels.add(channelId));

  const dbChannelsMap = new Map(dbChannels.map((channel) => [channel.channel_id, channel]));

  guild.channels.cache.each(async (channel) => {
    if (!(channel.isText() || channel.isVoice())) {
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
  console.log(`Synced guild ${guild.id} channels`);
}

module.exports = {
  addChannel,
  updateChannel,
  deleteChannel,
  syncChannels,
};
