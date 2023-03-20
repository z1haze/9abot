const {PermissionsBitField, ChannelType} = require('discord.js');

const knex = require('../db/knex');
const dbCache = require('../db/cache');

/**
 * Fetch settings or stub new settings
 * @param guild
 * @returns {Promise<*>}
 */
async function getSettings(guild) {
    let settings = await knex('settings')
        .where('guild_id', guild.id)
        .first('value');

    if (!settings) {
        settings = {
            channelIds: {
                memberCounter: null,
                onlineCounter: null,
                statsCategory: null,
            },
        };
    } else {
        settings = settings.value;
    }

    dbCache.settings.set(guild.id, settings);

    return settings;
}

/**
 * Save settings to db
 * @param guildId
 * @param settings
 * @returns {Promise<*>}
 */
async function saveSettings(guildId, settings = null) {
    if (!settings) {
        settings = dbCache.settings.get(guildId);
    }

    return knex('settings')
        .insert({
            guild_id: guildId,
            value: settings,
        })
        .onConflict('guild_id')
        .merge()
        .returning('*');
}

/**
 * Create the Guild Stats Category
 * @param guild
 * @param bot
 * @returns {Promise<*>}
 */
function createStatsCategory(guild, bot) {
    return guild.channels.create({
        name: 'Guild Stats',
        type: ChannelType.GuildCategory,
        position: 0,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.Connect],
            },
            {
                id: bot.id,
                allow: [PermissionsBitField.Flags.Connect],
            },
        ],
    });
}

/**
 * Create a Guild Stats Voice Channel
 * @param category
 * @param name
 * @param position
 * @returns {Promise<*>}
 */
function createVoiceChannel(category, name, position) {
    return category.children.create({
        name,
        type: ChannelType.GuildVoice,
        position,
    });
}

/**
 * Sync Guild Stats Channels
 * @param guild
 * @returns {Promise<void>}
 */
async function syncStats(guild) {
    const settings = await getSettings(guild);

    let needDBSync = false;
    let category;

    if (!settings.channelIds.statsCategory) {
        category = await createStatsCategory(guild, dbCache.me);
        needDBSync = true;
        settings.channelIds.statsCategory = category.id;
    } else {
        category = guild.channels.cache.get(settings.channelIds.statsCategory);

        if (!category) {
            category = await createStatsCategory(guild, dbCache.me);
            settings.channelIds.statsCategory = category.id;
            needDBSync = true;
        }
    }

    // handle member count channel
    if (!settings.channelIds.memberCounter) {
        const {id} = await createVoiceChannel(category, `Members: ${guild.memberCount}`, 1);
        settings.channelIds.memberCounter = id;
        needDBSync = true;
    } else {
        const memberCountChannel = guild.channels.cache.get(settings.channelIds.memberCounter);

        if (!memberCountChannel) {
            const {id} = await createVoiceChannel(category, `Members: ${guild.memberCount}`, 1);
            settings.channelIds.memberCounter = id;
            needDBSync = true;
        } else {
            await memberCountChannel.setName(`Members: ${guild.memberCount}`);
        }
    }

    // handle online count channel
    const onlineCount = guild.members.cache.filter((guildMember) => guildMember?.presence?.status === 'online').size;

    if (!settings.channelIds.onlineCounter) {
        const {id} = await createVoiceChannel(category, `Online: ${onlineCount}`, 2);
        settings.channelIds.onlineCounter = id;
        needDBSync = true;
    } else {
        const onlineCountChannel = guild.channels.cache.get(settings.channelIds.onlineCounter);

        if (!onlineCountChannel) {
            const {id} = await createVoiceChannel(category, `Online: ${onlineCount}`, 2);
            settings.channelIds.onlineCounter = id;
            needDBSync = true;
        } else {
            await onlineCountChannel.setName(`Online: ${onlineCount}`);
        }
    }

    if (needDBSync) {
        await saveSettings(guild.id);
    }
}

module.exports = {
    syncStats,
    getSettings
};
