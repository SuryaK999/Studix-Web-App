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
      maxRetriesPerRequest: 2,
      connectTimeout:       8000,
      ...(isTLS && { tls: {} }),  
    };

    pubClient = new Redis(REDIS_URL, redisOptions);
    subClient  = pubClient.duplicate();
    cacheClient = pubClient.duplicate();

    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
      cacheClient.connect(),
    ]);

    _ready = true;
    console.log('✅ Redis connected');

    pubClient.on('error', (err) => console.error('❌ Redis pub error:', err.message));
    subClient.on('error', (err) => console.error('❌ Redis sub error:', err.message));

  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    console.warn('⚠️  Falling back to in-memory adapter');
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
