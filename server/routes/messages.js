const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

const PAGE_SIZE = 50;

router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { before } = req.query;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    const query = { roomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message
      .find(query)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .lean();

    const mapped = messages.reverse().map(m => {
      const { _id, ...rest } = m;
      return { id: _id.toString(), ...rest };
    });

    res.json({
      messages:  mapped,
      hasMore:   messages.length === PAGE_SIZE,
      nextBefore: messages.length > 0 ? messages[0].createdAt : null,
    });
  } catch (err) {
    console.error('[API/messages] Error:', err.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

const Room = require('../models/Room');
const { expressAuthMiddleware } = require('../middleware/auth');
const mongoose = require('mongoose');

router.delete('/:roomId/:messageId', expressAuthMiddleware, async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const uid = req.user.uid;

    let msg = null;
    if (mongoose.Types.ObjectId.isValid(messageId)) {
      msg = await Message.findById(messageId);
    }
    if (!msg) {
      msg = await Message.findOne({ roomId, tempId: messageId });
    }

    if (msg) {
      let canDelete = msg.senderId === uid;
      if (!canDelete) {
        if (mongoose.Types.ObjectId.isValid(roomId)) {
          const room = await Room.findById(roomId).lean();
          if (room && (room.createdBy === uid || room.creatorId === uid || (room.adminIds && room.adminIds.includes(uid)))) {
            canDelete = true;
          }
        }
      }

      if (!canDelete) {
        return res.status(403).json({ error: 'Not authorized to delete this message' });
      }

      await Message.deleteOne({ _id: msg._id });
    }

    res.json({ success: true, messageId });
  } catch (err) {
    console.error('[API/messages] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
