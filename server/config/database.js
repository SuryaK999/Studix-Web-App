require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/studix';

let isConnected = false;
let retryTimeout = 10000;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    retryTimeout = 10000;
    console.log('✅ MongoDB connected');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Retrying...');
      isConnected = false;
      setTimeout(connectDB, retryTimeout);
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // If SRV lookup failed, attempt using public DNS
    if (err.message.includes('querySrv') && dns.setServers) {
      try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}
    }
    console.warn(`⚠️  Retrying MongoDB connection in ${Math.round(retryTimeout / 1000)}s...`);
    setTimeout(connectDB, retryTimeout);
    retryTimeout = Math.min(retryTimeout * 2, 60000); // Exponential backoff up to 60s
  }
}

function getMongoDBStatus() {
  return isConnected;
}

module.exports = { connectDB, getMongoDBStatus };
