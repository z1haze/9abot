const Base = require('./base');
const User = require('./user');
const VoiceChannel = require('./voice_channel');

class VoiceSession extends Base {
  static get tableName() {
    return 'discord_voice_sessions';
  }

  static get idColumn() {
    return 'voice_session_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: [
        'user_id',
        'voice_channel_id',
        'guild_id',
        'time_join',
      ],

      properties: {
        voice_session_id: { type: 'integer' },
        user_id: { type: 'string' },
        voice_channel_id: { type: 'string' },
        guild_id: { type: 'string' },
        time_join: { type: 'string' },
        time_leave: { type: 'string' },
      },
    };
  }

  static get relationMappings() {
    return {
      user: {
        relation: Base.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'discord_voice_sessions.user_id',
          to: 'users.user_id',
        },
      },

      voiceChannel: {
        relation: Base.BelongsToOneRelation,
        modelClass: VoiceChannel,
        join: {
          from: 'discord_voice_sessions.voice_channel_id',
          to: 'discord_voice_channels.voice_channel_id',
        },
      },
    };
  }
}

module.exports = VoiceSession;
