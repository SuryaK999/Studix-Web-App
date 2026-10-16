const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid:         { type: String, required: true, unique: true },
    email:       { type: String, default: null },
    displayName: { type: String, default: 'Anonymous' },
    username:    { type: String, unique: true, sparse: true }, 
    photoURL:    { type: String, default: null },
    bio:         { type: String, default: '' },
    status:      { type: String, default: '' },
    role:        { type: String, enum: ['admin', 'user'], default: 'user' },
    isOnline:    { type: Boolean, default: false },
    lastSeen:    { type: Date, default: Date.now },
    createdAt:   { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model('User', userSchema);
