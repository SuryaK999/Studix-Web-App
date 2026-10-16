const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true }, 
    role:   { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

membershipSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);
