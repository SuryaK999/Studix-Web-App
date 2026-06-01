require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const { connectDB, getMongoDBStatus } = require('./config/database');
const { connectRedis, isRedisReady, getPubClient, getSubClient } = require('./config/redis');
const { initSockets } = require('./sockets/index');

const messagesRouter = require('./routes/messages');
const notesRouter    = require('./routes/notes');
const roomsRouter    = require('./routes/rooms');
const usersRouter    = require('./routes/users');

const PORT          = process.env.PORT          || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: function (origin, callback) {
    
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  const start = Date.now();
  req.on('end', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`🐢 SLOW REQUEST: ${req.method} ${req.url} took ${duration}ms`);
    } else {
      console.log(`📡 ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    pid: process.pid,
    redis: isRedisReady(), 
    mongodb: getMongoDBStatus(),
    timestamp: new Date().toISOString() 
  });
});

app.use('/api/messages', messagesRouter);
app.use('/api/notes',    notesRouter);
app.use('/api/rooms',    roomsRouter);
app.use('/api/users',    usersRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin:      CLIENT_ORIGIN.split(',').map(o => o.trim()),
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  transports:          ['websocket', 'polling'],
  pingTimeout:         20000,
  pingInterval:        25000,
  maxHttpBufferSize:   1e6, 
  connectionStateRecovery: {
    
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});

app.set('io', io);

async function start() {
  console.log('🏁 Starting Studix Server...');

  console.log('⏳ Connecting to MongoDB...');
  try {
    await connectDB();
  } catch (err) {
    console.warn('⚠️ Server proceeding without blocking MongoDB (retrying in background)...');
  }

  console.log('⏳ Initializing Redis...');
  await connectRedis();

  if (isRedisReady()) {
    const { createAdapter } = require('@socket.io/redis-adapter');
    io.adapter(createAdapter(getPubClient(), getSubClient()));
    console.log('✅ Socket.IO Redis adapter enabled');
  } else {
    console.log('⚡ Socket.IO using in-memory adapter');
  }

  console.log('⏳ Initializing Socket handlers...');
  initSockets(io);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Studix Server [PID: ${process.pid}] is LIVER on port ${PORT}`);
    console.log(`   Client origin: ${CLIENT_ORIGIN}`);
    console.log(`   Health: http://127.0.0.1:${PORT}/health`);
  });
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000); 
}

process.on('uncaughtException',  (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

start();
