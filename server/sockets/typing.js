const xss = require('xss');

const typingState = new Map();

function registerTypingHandlers(socket, io) {
  socket.on('typing:start', ({ roomId, userId, userName }) => {
    try {
      if (!roomId || !userId) return;

      if (!typingState.has(roomId)) typingState.set(roomId, new Map());
      const roomTyping = typingState.get(roomId);
      const safeName = xss(String(userName || 'Anonymous').substring(0, 80));

      if (roomTyping.has(userId)) {
        clearTimeout(roomTyping.get(userId).timeout);
      }

      const timeout = setTimeout(() => {
        const rt = typingState.get(roomId);
        if (rt && rt.has(userId)) {
          rt.delete(userId);
          broadcastTyping(io, roomId, userId);
        }
      }, 2000);

      roomTyping.set(userId, { displayName: safeName, timeout });
      broadcastTyping(io, roomId, userId);
    } catch (_) {}
  });

  socket.on('typing:stop', ({ roomId, userId }) => {
    try {
      const rt = typingState.get(roomId);
      if (rt && rt.has(userId)) {
        clearTimeout(rt.get(userId).timeout);
        rt.delete(userId);
        broadcastTyping(io, roomId, userId);
      }
    } catch (_) {}
  });
}

function broadcastTyping(io, roomId, changedUserId) {
  const rt = typingState.get(roomId);
  const typingList = rt
    ? Array.from(rt.values()).map((v) => v.displayName)
    : [];

  io.to(roomId).emit('typing:update', {
    isTyping: typingList.length > 0,
    userId: changedUserId,
    typingList,
  });
}

function cleanupTyping(userId) {
  typingState.forEach((roomTyping, roomId) => {
    if (roomTyping.has(userId)) {
      clearTimeout(roomTyping.get(userId).timeout);
      roomTyping.delete(userId);
    }
    if (roomTyping.size === 0) {
      typingState.delete(roomId);
    }
  });
}

module.exports = { registerTypingHandlers, cleanupTyping };
