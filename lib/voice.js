const VoiceChannel = require('../models/voice_channel');
const VoiceSession = require('../models/voice_session');

const voiceSessions = new Map();

/**
 * Track a new voice session
 *
 * @param guildMember
 * @param voiceChannel
 * @returns {Promise<boolean>}
 */
async function handleJoinVoice(guildMember, voiceChannel) {
  // If we are handling a join session, but we already have a session stored,
  // that means we missed them leaving their last channel and need to skip this session
  if (voiceSessions.has(guildMember.user.id)) {
    // eslint-disable-next-line no-console
    console.warn(`Missed ${guildMember.displayName} leaving channel ${voiceChannel.name} (${voiceChannel.id}), ignoring session`);

    voiceSessions.delete(guildMember.user.id);

    return false;
  }

  const vcInDb = await VoiceChannel.query().findById(voiceChannel.id);

  if (!vcInDb) {
    await VoiceChannel.query().insert({
      voice_channel_id: voiceChannel.id,
      voice_channel_name: voiceChannel.name,
      guild_id: voiceChannel.guildId,
    });
  }

  // stub a voice session object and throw it into our map to track for later removal
  voiceSessions.set(guildMember.user.id, {
    user_id: guildMember.user.id,
    voice_channel_id: voiceChannel.id,
    guild_id: voiceChannel.guildId,
    time_join: new Date().toISOString(),
  });

  return true;
}

/**
 * Close a previously tracked voice session
 *
 * @param guildMember
 * @param voiceChannel
 * @returns {Promise<boolean>}
 */
async function handleLeaveVoice(guildMember, voiceChannel) {
  if (!voiceSessions.has(guildMember.user.id)) {
    // eslint-disable-next-line no-console
    console.warn(`Missed ${guildMember.displayName} joining channel ${voiceChannel.name} (${voiceChannel.id}), ignoring session`);

    return false;
  }

  const voiceSession = voiceSessions.get(guildMember.user.id);

  voiceSession.time_leave = new Date().toISOString();
  voiceSessions.delete(guildMember.user.id);

  await VoiceSession.query().insert(voiceSession);

  return true;
}

module.exports = {
  handleJoinVoice,
  handleLeaveVoice,
};
