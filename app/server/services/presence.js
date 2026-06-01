const { getCacheClient, isRedisReady } = require('../config/redis');
const User = require('../models/User');

const PRESENCE_TTL = 60; // seconds

/**
 * Mark a user as online in Redis.
 * Key: presence:user:{uid} = 1, TTL 60s
 */
async function setOnline(uid) {
  try {
    // 1. Redis for fast lookups
    if (isRedisReady()) {
      await getCacheClient().set(`presence:user:${uid}`, '1', 'EX', PRESENCE_TTL);
    }
    // 2. MongoDB for persistent state
    await User.findOneAndUpdate({ uid }, { isOnline: true, lastSeen: new Date() });
  } catch (_) {}
}

/**
 * Delete online key for a user.
 */
async function setOffline(uid) {
  try {
    // 1. Redis
    if (isRedisReady()) {
      await getCacheClient().del(`presence:user:${uid}`);
    }
    // 2. MongoDB
    await User.findOneAndUpdate({ uid }, { isOnline: false, lastSeen: new Date() });
  } catch (_) {}
}

/**
 * Reset TTL (heartbeat every 30s from client).
 */
async function heartbeat(uid) {
  if (!isRedisReady()) return;
  try {
    await getCacheClient().expire(`presence:user:${uid}`, PRESENCE_TTL);
  } catch (_) {}
}

/**
 * Check if a user is online.
 */
async function isOnline(uid) {
  if (!isRedisReady()) return false;
  try {
    const val = await getCacheClient().exists(`presence:user:${uid}`);
    return val === 1;
  } catch (_) {
    return false;
  }
}

/**
 * Given a list of user IDs, return the subset that are currently online.
 */
async function getOnlineUsers(userIds) {
  if (!userIds || userIds.length === 0) return [];
  if (!isRedisReady()) return [];

  try {
    const pipeline = getCacheClient().pipeline();
    userIds.forEach((uid) => pipeline.exists(`presence:user:${uid}`));
    const results = await pipeline.exec();

    return userIds.filter((_, i) => results[i] && results[i][1] === 1);
  } catch (_) {
    return [];
  }
}

module.exports = { setOnline, setOffline, heartbeat, isOnline, getOnlineUsers };
