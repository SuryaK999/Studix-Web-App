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

module.exports = router;
