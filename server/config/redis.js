require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

let pubClient = null;
let subClient = null;
let cacheClient = null;
let _ready = false;

async function connectRedis() {
  if (!REDIS_ENABLED) {
    console.log('⚡ Redis disabled. Using in-memory fallback.');
    return;
  }

  try {

    const isTLS = REDIS_URL.startsWith('rediss://');

    const redisOptions = {
      lazyConnect:          true,
      enableReadyCheck:     true,
      maxRetriesPerRequest: 1,
      connectTimeout:       4000,
      retryStrategy(times) {
        if (times > 2) return null; // Stop retrying on persistent errors
        return Math.min(times * 200, 1000);
      },
      ...(isTLS && { tls: {} }),  
    };

    pubClient = new Redis(REDIS_URL, redisOptions);
    subClient  = pubClient.duplicate();
    cacheClient = pubClient.duplicate();

    const handleRedisError = (name) => (err) => {
      if (_ready) {
        console.error(`❌ Redis ${name} error:`, err.message);
      }
    };

    pubClient.on('error', handleRedisError('pub'));
    subClient.on('error', handleRedisError('sub'));
    cacheClient.on('error', handleRedisError('cache'));

    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
      cacheClient.connect(),
    ]);

    _ready = true;
    console.log('✅ Redis connected');

  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    console.warn('⚠️  Falling back to in-memory adapter');
    try { pubClient?.disconnect(); } catch (_) {}
    try { subClient?.disconnect(); } catch (_) {}
    try { cacheClient?.disconnect(); } catch (_) {}
    _ready = false;
    pubClient = null;
    subClient = null;
    cacheClient = null;
  }
}

function isRedisReady() {
  return _ready && pubClient !== null;
}

function getPubClient() {
  return pubClient;
}

function getSubClient() {
  return subClient;
}

function getCacheClient() {
  return cacheClient;
}

module.exports = { connectRedis, isRedisReady, getPubClient, getSubClient, getCacheClient };
