require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/studix';

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ MongoDB connected');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Retrying...');
      isConnected = false;
      setTimeout(connectDB, 5000);
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.warn('⚠️  Retrying MongoDB connection in 5s...');
    setTimeout(connectDB, 5000);
  }
}

function getMongoDBStatus() {
  return isConnected;
}

module.exports = { connectDB, getMongoDBStatus };
