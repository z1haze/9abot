// users can exist in multiple guilds, so they need to be stored in a map of guild id => user id

const cache = {
  channels: new Set(),
  users: new Map(),
  roles: new Set(),
  settings: new Map(),
  me: null, // client user (bot)
  statIntervals: new Map(),
};

module.exports = cache;
