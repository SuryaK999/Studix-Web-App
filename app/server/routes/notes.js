const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    const note = await Note.findOne({ roomId }).lean();
    res.json({
      content:   note?.content || '<p>Start collaborating on notes...</p>',
      updatedAt: note?.updatedAt || null,
      updatedBy: note?.updatedBy || null,
    });
  } catch (err) {
    console.error('[API/notes] Error:', err.message);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

module.exports = router;
