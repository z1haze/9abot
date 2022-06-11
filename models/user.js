const Base = require('./base');

class User extends Base {
  static get tableName() {
    return 'discord_users';
  }

  static get idColumn() {
    return ['user_id', 'guild_id'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: [
        'user_id',
        'username',
        'discriminator',
        'guild_id',
        'joined_timestamp',
      ],

      properties: {
        user_id: { type: 'string' },
        username: { type: 'string' },
        discriminator: { type: 'string' },
        nickname: { type: ['string', 'null'] },
        guild_id: { type: 'string' },
        steam_id: { type: 'string' },
        is_bot: { type: 'boolean' },
        joined_timestamp: { type: 'string' },
        quit_timestamp: { type: ['string', 'null'] },
      },
    };
  }
}

module.exports = User;
