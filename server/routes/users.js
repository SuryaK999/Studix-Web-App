const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { expressAuthMiddleware } = require('../middleware/auth');

router.use(expressAuthMiddleware);

router.get('/profile', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { displayName, username, bio } = req.body;
    const uid = req.user.uid;

    const updates = {};
    if (displayName) updates.displayName = displayName.trim().substring(0, 32);
    if (bio !== undefined) updates.bio = bio.trim().substring(0, 160);
    if (req.body.status !== undefined) updates.status = req.body.status.trim().substring(0, 64);
    if (req.body.photoURL !== undefined) updates.photoURL = req.body.photoURL;
    
    if (username) {
      const normalizedUsername = username.toLowerCase().trim();
      
      if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
        return res.status(400).json({ error: 'Invalid username format' });
      }

      const existing = await User.findOne({ username: normalizedUsername, uid: { $ne: uid } });
      if (existing) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      updates.username = normalizedUsername;
    }

    const updatedUser = await User.findOneAndUpdate(
      { uid },
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    res.json(updatedUser);
  } catch (err) {
    console.error('[API/users] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/username-check/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.json({ available: false, error: 'Invalid format' });
    }

    const existing = await User.findOne({ username });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
