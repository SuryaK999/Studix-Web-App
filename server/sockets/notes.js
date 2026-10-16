const Note = require('../models/Note');

const saveTimers = new Map();
const DEBOUNCE_MS = 700;

function registerNotesHandlers(socket, io) {
  
  socket.on('notes:update', ({ roomId, content, cursorPos }) => {
    try {
      if (!roomId || content === undefined) return;
      if (!socket.user) return;

      socket.to(roomId).emit('notes:patch', {
        content,
        cursorPos,
        senderId: socket.user.uid,
        senderName: socket.user.displayName,
      });

      if (saveTimers.has(roomId)) {
        clearTimeout(saveTimers.get(roomId));
      }

      const timer = setTimeout(async () => {
        saveTimers.delete(roomId);
        try {
          await Note.findOneAndUpdate(
            { roomId },
            { content, updatedBy: socket.user.uid, updatedAt: new Date() },
            { upsert: true, new: true }
          );
          
          socket.emit('notes:saved', { roomId, at: new Date().toISOString() });
        } catch (err) {
          console.error(`[Notes] Save failed for room ${roomId}:`, err.message);
          socket.emit('notes:save_error', { roomId });
        }
      }, DEBOUNCE_MS);

      saveTimers.set(roomId, timer);
    } catch (_) {}
  });

  socket.on('notes:load', async ({ roomId }) => {
    try {
      if (!roomId) return;
      const note = await Note.findOne({ roomId }).lean();
      socket.emit('notes:content', {
        roomId,
        content: note?.content || '<p>Start collaborating on notes...</p>',
        updatedAt: note?.updatedAt || null,
      });
    } catch (err) {
      console.error(`[Notes] Load failed for room ${roomId}:`, err.message);
      socket.emit('notes:content', {
        roomId,
        content: '<p>Start collaborating on notes...</p>',
        updatedAt: null,
      });
    }
  });
}

module.exports = { registerNotesHandlers };
