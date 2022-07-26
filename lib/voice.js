const knex = require('../db/knex');
const dbCache = require('../db/knex');
const { addChannel } = require('./channels');

const voiceSessions = new Map();

/**
 * Track a new voice session
 *
 * @param member
 * @param channel
 * @returns {Promise<boolean>}
 */
async function handleJoinVoice({ member, channel }) {
  // If we are handling a join session, but we already have a session stored,
  // that means we missed them leaving their last channel and need to skip this session
  if (voiceSessions.has(member.user.id)) {
    // eslint-disable-next-line no-console
    console.warn(`Missed ${member.displayName} leaving channel ${channel.name} (${channel.id}), ignoring session`);

    voiceSessions.delete(member.user.id);

    return false;
  }

  if (!dbCache.channels.has(channel.id)) {
    await addChannel(channel);
  }

  // stub a voice session object and throw it into our map to track for later removal
  voiceSessions.set(member.user.id, {
    guild_id: member.guild.id,
    user_id: member.user.id,
    channel_id: channel.id,
    time_join: new Date().toISOString(),
  });

  return true;
}

/**
 * Close a previously tracked voice session
 *
 * @param id
 * @param member
 * @param channel
 * @returns {Promise<boolean>}
 */
async function handleLeaveVoice({ member, channel }) {
  if (!voiceSessions.has(member.user.id)) {
    // eslint-disable-next-line no-console
    console.warn(`Missed ${member.displayName} joining channel ${channel.name} (${channel.id}), ignoring session`);

    return false;
  }

  const voiceSession = voiceSessions.get(member.user.id);

  voiceSession.time_leave = new Date().toISOString();
  voiceSessions.delete(member.user.id);

  await knex('discord_voice_sessions').insert(voiceSession);

  return true;
}

module.exports = {
  handleJoinVoice,
  handleLeaveVoice,
};
