const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Membership = require('../models/Membership');
const { expressAuthMiddleware } = require('../middleware/auth');
const { getOnlineUsers } = require('../services/presence');

async function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const existing = await Room.findOne({ inviteCode: code });
  if (existing) return generateInviteCode();
  return code;
}

router.use(expressAuthMiddleware);

router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    console.log(`[API/rooms] Fetching rooms for user: ${uid}`);
    
    const memberships = await Membership.find({ userId: uid }).lean();
    const roomIds = memberships.map(m => m.roomId);

    if (roomIds.length === 0) return res.json([]);

    const rooms = await Room.find({ _id: { $in: roomIds } }).lean();
    
    const enrichedRooms = await Promise.all(rooms.map(async (room) => {
       const membs = await Membership.find({ roomId: room._id.toString() }, 'userId').lean();

       if (!room.inviteCode) {
         room.inviteCode = await generateInviteCode();
         await Room.updateOne({ _id: room._id }, { $set: { inviteCode: room.inviteCode } });
         console.log(`[API/rooms] Generated new inviteCode for room: ${room._id}`);
       }

       return {
         ...room,
         id: room._id.toString(),
         members: membs.map(m => m.userId)
       };
    }));

    enrichedRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(enrichedRooms);
  } catch (err) {
    console.error('[API/rooms] Error fetching rooms:', err.message);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/explore', async (req, res) => {
  try {
    
    const query = { $or: [{ 'settings.isPrivate': false }, { 'settings.isPrivate': { $exists: false } }] };
    const rooms = await Room.find(query).lean();

    const enrichedRooms = await Promise.all(rooms.map(async (room) => {
      const membersCount = await Membership.countDocuments({ roomId: room._id.toString() });
      return {
        ...room,
        id: room._id.toString(),
        membersCount
      };
    }));

    enrichedRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(enrichedRooms);
  } catch (err) {
    console.error('[API/rooms/explore] Error fetching global rooms:', err.message);
    res.status(500).json({ error: 'Failed to fetch global rooms' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (!room.inviteCode) {
      room.inviteCode = await generateInviteCode();
      await room.save();
    }

    const memberships = await Membership.find({ roomId: id }).lean();
    const members = memberships.map(m => m.userId);

    res.json({
      ...room.toObject(),
      id: room._id.toString(),
      members
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

router.get('/:id/presence', async (req, res) => {
  try {
    const { id } = req.params;
    const memberships = await Membership.find({ roomId: id }).lean();
    const userIds = memberships.map(m => m.userId);

    const onlineUids = await getOnlineUsers(userIds);

    const User = require('../models/User');
    const onlineUsers = await User.find({ uid: { $in: onlineUids } }, 'uid displayName photoURL').lean();
    
    res.json(onlineUsers);
  } catch (err) {
    console.error('[API/rooms] Presence error:', err.message);
    res.status(500).json({ error: 'Failed to fetch room presence' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name required' });

    const uid = req.user.uid;

    const newRoom = await Room.create({
      name,
      description: description || '',
      createdBy:   uid,
      inviteCode:  await generateInviteCode(),
      settings:    { isPrivate: !!isPrivate }
    });

    const roomIdStr = newRoom._id.toString();

    await Membership.create({
      roomId: roomIdStr,
      userId: uid,
      role: 'owner'
    });

    const payload = {
      ...newRoom.toObject(),
      id: roomIdStr,
      membersCount: 1,
      members: [uid]
    };

    if (!isPrivate && req.app.get('io')) {
      req.app.get('io').emit('global:room_created', payload);
    }

    return res.status(201).json(payload);
  } catch (err) {
    console.error('[API/rooms] Create error:', err.message);
    return res.status(500).json({ error: 'ROOM_CREATE_FAILED' });
  }
});

router.post('/:idOrCode/join', async (req, res) => {
  try {
    const { idOrCode } = req.params;
    const uid = req.user.uid;

    let room = await Room.findOne({ inviteCode: idOrCode.toUpperCase() }).lean();
    if (!room) {
      if (idOrCode.length > 20) { 
        room = await Room.findById(idOrCode).lean();
      }
    }
    
    if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Invalid Room ID or Invite Code' });

    const roomId = room._id.toString();

    const memberCount = await Membership.countDocuments({ roomId });
    if (memberCount >= (room.maxParticipants || 50)) {
      return res.status(403).json({ error: 'ROOM_FULL', message: 'This room has reached its maximum capacity' });
    }

    const existing = await Membership.findOne({ roomId, userId: uid });
    if (!existing) {
      await Membership.create({
        roomId,
        userId: uid,
        role: 'member',
        joinedAt: new Date()
      });
    }
    
    res.json({ success: true, roomId });
  } catch (err) {
    console.error('[API/rooms] Join error:', err.message);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

module.exports = router;
