const Base = require('./base');
const VoiceSession = require('./voice_session');

class VoiceChannel extends Base {
  static get tableName() {
    return 'discord_voice_channels';
  }

  static get idColumn() {
    return 'voice_channel_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: [
        'voice_channel_id',
        'voice_channel_name',
        'guild_id',
      ],

      properties: {
        voice_channel_id: { type: 'string' },
        voice_channel_name: { type: 'string' },
        guild_id: { type: 'string' },
      },
    };
  }

  static get relationMappings() {
    return {
      voiceSessions: {
        relation: Base.HasManyRelation,
        modelClass: VoiceSession,
        join: {
          from: 'discord_voice_channels.voice_channel_id',
          to: 'discord_voice_sessions.voice_channel_id',
        },
      },
    };
  }
}

module.exports = VoiceChannel;
