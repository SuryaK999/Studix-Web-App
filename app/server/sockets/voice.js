'use strict';

const { getCacheClient, isRedisReady } = require('../config/redis');

const MAX_VOICE_USERS = 20;

const inMemoryVoiceRooms = new Map(); 

async function getParticipants(roomId) {
  const redis = isRedisReady() ? getCacheClient() : null;
  if (!redis) {
    const room = inMemoryVoiceRooms.get(roomId) || new Map();
    return Array.from(room.values());
  }

  const key = `voiceSessions:${roomId}:participants`;
  const raw = await redis.hgetall(key);
  const participants = [];
  for (const uid in raw) {
    try { participants.push(JSON.parse(raw[uid])); } catch {}
  }
  return participants;
}

async function setParticipant(roomId, userId, data) {
  const redis = isRedisReady() ? getCacheClient() : null;
  if (!redis) {
    if (!inMemoryVoiceRooms.has(roomId)) inMemoryVoiceRooms.set(roomId, new Map());
    inMemoryVoiceRooms.get(roomId).set(userId, data);
    return;
  }
  const key = `voiceSessions:${roomId}:participants`;
  await redis.hset(key, userId, JSON.stringify(data));
  
  await redis.expire(key, 60 * 60 * 12); 
}

async function removeParticipant(roomId, userId) {
  const redis = isRedisReady() ? getCacheClient() : null;
  if (!redis) {
    if (inMemoryVoiceRooms.has(roomId)) {
      inMemoryVoiceRooms.get(roomId).delete(userId);
    }
    return;
  }
  const key = `voiceSessions:${roomId}:participants`;
  await redis.hdel(key, userId);
}

function registerVoiceHandlers(socket, io) {
  
  socket.on('voice:join', async ({ roomId, userId, name, avatar }) => {
    if (!roomId || !userId) return;

    socket.voiceRoomId = roomId;
    socket.voiceUserId = userId;

    const currentParticipants = await getParticipants(roomId);

    if (currentParticipants.length >= MAX_VOICE_USERS) {
      
      if (!currentParticipants.find(p => p.userId === userId)) {
        socket.emit('voice:error', { message: `Voice room full (max ${MAX_VOICE_USERS})` });
        return;
      }
    }

    const joiningData = {
      socketId: socket.id,
      userId,
      name: name || 'User',
      avatar: avatar || null,
      joinedAt: Date.now(),
      isMuted: false
    };

    await setParticipant(roomId, userId, joiningData);

    const updatedParticipants = await getParticipants(roomId);

    socket.join(`voice:${roomId}`);

    io.in(`voice:${roomId}`).emit('voice:participants:update', { roomId, participants: updatedParticipants });

    socket.to(`voice:${roomId}`).emit('voice:user-joined', { userId, socketId: socket.id });

    const existingForWebRTC = updatedParticipants.filter(p => p.socketId !== socket.id);
    socket.emit('voice:existing-members', { members: existingForWebRTC });
  });

  socket.on('voice:offer', ({ targetSocketId, offer }) => {
    if (!targetSocketId || !offer) return;
    io.to(targetSocketId).emit('voice:offer', { offer, from: socket.id });
  });

  socket.on('voice:answer', ({ targetSocketId, answer }) => {
    if (!targetSocketId || !answer) return;
    io.to(targetSocketId).emit('voice:answer', { answer, from: socket.id });
  });

  socket.on('voice:ice-candidate', ({ targetSocketId, candidate }) => {
    if (!targetSocketId || !candidate) return;
    io.to(targetSocketId).emit('voice:ice-candidate', { candidate, from: socket.id });
  });

  socket.on('voice:mute', async ({ roomId, muted }) => {
    if (!roomId || !socket.voiceUserId) return;

    const list = await getParticipants(roomId);
    const self = list.find(p => p.userId === socket.voiceUserId);
    if (self) {
      self.isMuted = muted;
      await setParticipant(roomId, socket.voiceUserId, self);
    }

    socket.to(`voice:${roomId}`).emit('voice:mute', { socketId: socket.id, muted });
  });

  socket.on('voice:speaking', ({ roomId, speaking }) => {
    if (!roomId) return;
    socket.to(`voice:${roomId}`).emit('voice:user-speaking', { socketId: socket.id, speaking });
  });

  socket.on('voice:position', ({ roomId, x, y }) => {
    if (!roomId || x == null || y == null) return;
    socket.to(`voice:${roomId}`).emit('voice:user-position', { socketId: socket.id, x, y });
  });

  socket.on('voice:leave', async ({ roomId }) => {
    if (!roomId) return;
    await _handleLeave(socket, roomId, io);
  });
}

async function cleanupVoice(socket, io) {
  if (socket.voiceRoomId && socket.voiceUserId) {
    await _handleLeave(socket, socket.voiceRoomId, io);
  }
}

async function _handleLeave(socket, roomId, io) {
  const userId = socket.voiceUserId;
  if (!userId) return;

  socket.leave(`voice:${roomId}`);

  const participantsBefore = await getParticipants(roomId);
  const me = participantsBefore.find(p => p.userId === userId);

  if (me && me.socketId === socket.id) {
    await removeParticipant(roomId, userId);
  }

  const updatedParticipants = await getParticipants(roomId);

  if (io) {
    io.in(`voice:${roomId}`).emit('voice:participants:update', { roomId, participants: updatedParticipants });
    io.in(`voice:${roomId}`).emit('voice:user-left', { socketId: socket.id });
  }

  socket.voiceRoomId = null;
  socket.voiceUserId = null;
}

module.exports = { registerVoiceHandlers, cleanupVoice };
