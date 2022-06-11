const User = require('../models/user');

function addUser(guildMember, guildId) {
  return User.query().insert({
    user_id: guildMember.user.id,
    username: guildMember.user.username,
    discriminator: guildMember.user.discriminator,
    nickname: guildMember.nickname,
    guild_id: guildId,
    is_bot: guildMember.user.bot,
    joined_timestamp: new Date(guildMember.joinedTimestamp).toISOString(),
  });
}

async function syncUsers(guild) {
  // eslint-disable-next-line no-console
  console.log(`Syncing guild ${guild.id} users begin`);

  const dbUsers = await User.query().where('guild_id', guild.id);
  const usersWhoQuit = new Set();
  const dbUsersMap = new Map();

  // Initialize our data sets with all users in the database
  dbUsers.forEach((user) => {
    usersWhoQuit.add(user.user_id);
    dbUsersMap.set(user.user_id, user);
  });

  const promises = [];

  /**
   * 1. Add new users who joined while the bot was offline
   * 2. Remove every member from the usersWhoQuit set that
   * exist in the guild so they won't be marked as quit
   * TODO: handle re-adding of previously joined members
   */
  guild.members.cache.each(async (guildMember) => {
    if (!dbUsersMap.has(guildMember.user.id)) {
      promises.push(addUser(guildMember, guild.id));
    } else {
      usersWhoQuit.delete(guildMember.user.id);
    }
  });

  await Promise.all(promises);

  if (usersWhoQuit.size > 0) {
    // flag users who quit with a quit timestamp
    await User.query().patch({ quit_timestamp: new Date().toISOString() }).whereIn('user_id', Array.from(usersWhoQuit));
  }

  // eslint-disable-next-line no-console
  console.log(`Syncing guild ${guild.id} users complete`);
}

module.exports = {
  syncUsers,
  addUser,
};
