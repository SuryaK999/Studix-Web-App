const { firebaseAuthMiddleware } = require('../middleware/auth');
const { registerChatHandlers } = require('./chat');
const { registerTypingHandlers, cleanupTyping } = require('./typing');
const { registerNotesHandlers } = require('./notes');
const { registerVoiceHandlers, cleanupVoice } = require('./voice');
const { setOnline, setOffline, heartbeat } = require('../services/presence');
const { cleanupMemoryLimiter } = require('../services/rateLimiter');

const socketMap = new Map();

function initSockets(io) {
  
  io.use(firebaseAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    console.log(`[+] ${user.displayName} (${socket.id}) connected`);

    setOnline(user.uid).catch(() => {});

    socket.on('room:join', async ({ roomId }) => {
      if (!roomId || typeof roomId !== 'string') return;

      const prevInfo = socketMap.get(socket.id);
      if (prevInfo && prevInfo.roomId !== roomId) {
        socket.leave(prevInfo.roomId);
      }

      socket.join(roomId);
      socketMap.set(socket.id, { roomId, userId: user.uid });

      let dbUsername = null;
      let dbStatus = null;
      try {
        const User = require('../models/User');
        const dbUser = await User.findOne({ uid: user.uid }).lean();
        if (dbUser) {
          dbUsername = dbUser.username || null;
          dbStatus = dbUser.status || null;
        }
      } catch (_) {}

      socket.to(roomId).emit('presence:joined', {
        userId:      user.uid,
        displayName: user.displayName,
        username:    dbUsername,
        status:      dbStatus,
        photoURL:    user.photoURL,
      });
    });

    socket.on('room:leave', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId);
      const info = socketMap.get(socket.id);
      if (info && info.roomId === roomId) {
        socketMap.delete(socket.id);
      }
      io.to(roomId).emit('presence:left', { userId: user.uid });
    });

    socket.on('presence:heartbeat', () => {
      heartbeat(user.uid).catch(() => {});
    });

    socket.on('presence:status', async ({ roomId, status }) => {
      if (!roomId) return;
      try {
        const User = require('../models/User');
        await User.updateOne({ uid: user.uid }, { $set: { status: status || '' } });
      } catch (e) {
        console.warn('[Presence] Status persist error:', e.message);
      }
      io.to(roomId).emit('presence:status_update', {
        userId:  user.uid,
        status:  status || null,
      });
    });

    socket.on('presence:profile_update', ({ roomId, updates }) => {
      if (!roomId) return;
      io.to(roomId).emit('presence:profile_sync', {
        userId:  user.uid,
        updates: updates,
      });
    });

    registerChatHandlers(socket, io);
    registerTypingHandlers(socket, io);
    registerNotesHandlers(socket, io);
    registerVoiceHandlers(socket, io);

    socket.on('disconnect', (reason) => {
      console.log(`[-] ${user.displayName} (${socket.id}) disconnected: ${reason}`);

      const info = socketMap.get(socket.id);
      if (info) {
        const { roomId, userId } = info;

        socket.to(roomId).emit('presence:left', { userId });
        socketMap.delete(socket.id);
      }

      cleanupVoice(socket, io);
      cleanupTyping(user.uid);

      setOffline(user.uid).catch(() => {});

      cleanupMemoryLimiter(user.uid);
    });

    socket.on('connect_error', (err) => {
      console.error(`[Socket] connect_error: ${err.message}`);
    });
  });
}

module.exports = { initSockets };
