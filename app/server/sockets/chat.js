const xss = require('xss');
const Message = require('../models/Message');
const { checkRateLimit } = require('../services/rateLimiter');

function registerChatHandlers(socket, io) {
  
  socket.on('chat:send', async ({ roomId, message }) => {
    try {
      if (!roomId || typeof roomId !== 'string') return;
      if (!message || typeof message !== 'object') return;

      const { type = 'text', text, fileUrl, fileName, fileSize, fileDuration } = message;

      if (!socket.user) return; 

      const allowed = await checkRateLimit(socket.user.uid);
      if (!allowed) {
        socket.emit('chat:rate_limited', {
          message: 'Slow down! Max 20 messages per 5 seconds.',
        });
        return;
      }

      const safeText = text ? xss(String(text).substring(0, 2000)) : '';

      const msgPayload = {
        senderId:       socket.user.uid,
        senderName:     socket.user.displayName || 'Anonymous',
        senderPhotoURL: socket.user.photoURL || null,
        type,
        text:           safeText,
        fileUrl:        fileUrl || null,
        fileName:       fileName || null,
        fileSize:       fileSize || null,
        fileDuration:   fileDuration || null,
        reactions:      {},
        createdAt:      new Date(),
      };

      const fallbackId = message.tempId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // 1. INSTANT BROADCAST (Zero Latency < 2ms): Broadcast to room peers immediately
      const broadcastPayload = {
        id: fallbackId,
        ...msgPayload,
        roomId,
        tempId: message.tempId || null,
      };
      io.to(roomId).emit('chat:receive', broadcastPayload);

      // 2. ASYNC PERSISTENCE: Save to MongoDB in background
      Message.create({ roomId, ...msgPayload })
        .then((saved) => {
          const realId = saved._id.toString();
          socket.emit('chat:saved', { tempId: message.tempId, id: realId });
        })
        .catch((dbErr) => {
          console.warn(`[Chat] DB async save notice for room ${roomId}:`, dbErr.message);
          // Message already delivered in real-time to active participants
        });

    } catch (err) {
      console.error('[Chat] Handler error:', err.message);
    }
  });

  socket.on('chat:load', async ({ roomId, before }) => {
    try {
      if (!roomId) return;

      const query = { roomId };
      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      const messages = await Message
        .find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const mapped = messages.reverse().map(m => {
        const { _id, ...rest } = m;
        return { id: _id.toString(), ...rest };
      });

      socket.emit('chat:history', {
        roomId,
        messages: mapped,
      });
    } catch (err) {
      console.warn('[Chat] Load error:', err.message);
      socket.emit('chat:history', { roomId, messages: [] });
    }
  });

  socket.on('chat:react', async ({ roomId, messageId, emoji }) => {
    try {
      if (!roomId || !messageId || !emoji || !socket.user) return;

      const userId = socket.user.uid;
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const reactions = {};
      const reactionUsers = {};

      if (msg.reactions) {
        const raw = msg.reactions.toJSON ? msg.reactions.toJSON() : msg.reactions;
        for (const [key, users] of Object.entries(raw)) {
          if (Array.isArray(users)) {
            reactions[key] = [...users];
          }
        }
      }

      if (msg.reactionUsers) {
        const rawNames = msg.reactionUsers.toJSON ? msg.reactionUsers.toJSON() : msg.reactionUsers;
        Object.assign(reactionUsers, rawNames);
      }

      let currentEmoji = null;
      for (const [key, users] of Object.entries(reactions)) {
        if (users.includes(userId)) {
          currentEmoji = key;
          break;
        }
      }

      if (currentEmoji === emoji) {
        reactions[emoji] = reactions[emoji].filter(uid => uid !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
        delete reactionUsers[userId];
      } else {
        if (currentEmoji && reactions[currentEmoji]) {
          reactions[currentEmoji] = reactions[currentEmoji].filter(uid => uid !== userId);
          if (reactions[currentEmoji].length === 0) delete reactions[currentEmoji];
        }
        
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes(userId)) {
          reactions[emoji].push(userId);
        }
        
        reactionUsers[userId] = socket.user.displayName;
      }

      await Message.findByIdAndUpdate(messageId, { 
        $set: { reactions, reactionUsers } 
      });

      io.to(roomId).emit('chat:reaction_update', {
        messageId,
        reactions,
        reactionUsers,
      });
    } catch (err) {
      console.warn('[Chat] React error:', err.message);
      socket.emit('chat:react_error', { messageId, emoji });
    }
  });

  socket.on('chat:edit', async ({ roomId, messageId, newText }) => {
    try {
      if (!roomId || !messageId || !socket.user) return;
      const safeText = newText ? xss(String(newText).substring(0, 2000)) : '';
      if (!safeText) return; 

      const msg = await Message.findById(messageId);
      if (!msg || msg.senderId !== socket.user.uid) return; 

      const updatedMsg = await Message.findByIdAndUpdate(
        messageId,
        { $set: { text: safeText, editedAt: new Date() } },
        { new: true }
      );

      io.to(roomId).emit('chat:message_edited', {
        messageId,
        text: updatedMsg.text,
        editedAt: updatedMsg.editedAt,
      });
    } catch (err) {
      console.warn('[Chat] Edit error:', err.message);
    }
  });

  socket.on('chat:delete', async ({ roomId, messageId }) => {
    try {
      if (!roomId || !messageId || !socket.user) return;

      const msg = await Message.findById(messageId);
      if (!msg || msg.senderId !== socket.user.uid) return; 

      await Message.findByIdAndDelete(messageId);

      io.to(roomId).emit('chat:message_deleted', { messageId });
    } catch (err) {
      console.warn('[Chat] Delete error:', err.message);
    }
  });
}

module.exports = { registerChatHandlers };
