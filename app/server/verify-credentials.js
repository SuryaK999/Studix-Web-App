require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const SKIP = '⏭️  SKIP';
let failed = 0;

function log(label, status, detail = '') {
  console.log(`${status}  ${label.padEnd(35)} ${detail}`);
  if (status === FAIL) failed++;
}

async function checkEnv() {
  console.log('\n══════════════════════════════════════════');
  console.log('   Studix — Credential Verifier');
  console.log('══════════════════════════════════════════\n');
  console.log('[ ENV VARIABLES ]\n');

  const mongo = process.env.MONGO_URI || '';
  const proj  = process.env.FIREBASE_PROJECT_ID || '';
  const gac   = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  const b64   = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
  const redis = process.env.REDIS_URL || '';
  const redisOn = process.env.REDIS_ENABLED === 'true';

  mongo ? log('MONGO_URI',          PASS, mongo.slice(0, 50) + '...') : log('MONGO_URI', FAIL, '← not set');
  proj  ? log('FIREBASE_PROJECT_ID', PASS, proj)                       : log('FIREBASE_PROJECT_ID', FAIL, '← not set');

  if (gac)      log('GOOGLE_APPLICATION_CREDENTIALS', PASS, gac);
  else if (b64) log('FIREBASE_SERVICE_ACCOUNT_BASE64', PASS, '(set)');
  else          log('Firebase Admin credentials',      FAIL, '← set GOOGLE_APPLICATION_CREDENTIALS or BASE64');

  if (!redisOn) log('Redis',     SKIP, '(REDIS_ENABLED=false — memory fallback)');
  else if(redis) log('REDIS_URL', PASS, redis.replace(/:([^:@]{4})[^:@]*@/, ':****@'));
  else           log('REDIS_URL', FAIL, '← REDIS_ENABLED=true but REDIS_URL missing');
}

async function checkMongo() {
  console.log('\n[ MONGODB ]\n');
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 7000 });
    const info = await mongoose.connection.db.admin().serverInfo();
    log('MongoDB connection', PASS, `v${info.version} @ ${mongoose.connection.host}`);
    await mongoose.disconnect();
  } catch (e) {
    log('MongoDB connection', FAIL, e.message.slice(0, 90));
  }
}

async function checkFirebase() {
  console.log('\n[ FIREBASE ADMIN SDK ]\n');
  try {
    const admin = require('firebase-admin');
    const apps  = [...admin.apps];
    apps.forEach(a => a?.delete().catch(() => {}));

    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString());
      credential = admin.credential.cert(sa);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Resolve relative to server/ dir
      const p  = require('path').resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
      const sa = require(p);
      credential = admin.credential.cert(sa);
    } else {
      log('Firebase Admin SDK', FAIL, '← no credentials configured'); return;
    }

    const app = admin.initializeApp({ credential }, `verify_${Date.now()}`);
    await admin.auth(app).listUsers(1);
    log('Firebase Admin SDK', PASS, `project: ${process.env.FIREBASE_PROJECT_ID}`);
    await app.delete();
  } catch (e) {
    log('Firebase Admin SDK', FAIL, e.message.slice(0, 90));
  }
}

async function checkRedis() {
  if (process.env.REDIS_ENABLED !== 'true') {
    console.log('\n[ REDIS — SKIPPED ]\n');
    return;
  }
  console.log('\n[ REDIS ]\n');
  try {
    const Redis  = require('ioredis');
    const url    = process.env.REDIS_URL || '';
    const isTLS  = url.startsWith('rediss://');
    const client = new Redis(url, { lazyConnect: true, connectTimeout: 8000, maxRetriesPerRequest: 1, ...(isTLS && { tls: {} }) });
    await client.connect();
    const pong = await client.ping();
    await client.set('studix:test', '1', 'EX', 10);
    const val  = await client.get('studix:test');
    if (pong === 'PONG' && val === '1') {
      log('Redis connection', PASS, `ping: PONG | TLS: ${isTLS} | SET+GET: OK`);
    } else {
      log('Redis connection', FAIL, `unexpected: ping=${pong} get=${val}`);
    }
    await client.quit();
  } catch (e) {
    log('Redis connection', FAIL, e.message.slice(0, 90));
  }
}

(async () => {
  await checkEnv();
  await checkMongo();
  await checkFirebase();
  await checkRedis();

  console.log('\n══════════════════════════════════════════');
  if (failed === 0) {
    console.log('  🎉 ALL CHECKS PASSED — ready to run!');
  } else {
    console.log(`  ⚠️  ${failed} check(s) failed — fix the errors above, then re-run`);
    console.log('     node verify-credentials.js');
  }
  console.log('══════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
})();
