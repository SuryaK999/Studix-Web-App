const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    createdBy:   { type: String, required: true }, 
    inviteCode:  { type: String, unique: true, sparse: true, index: true },
    maxParticipants: { type: Number, default: 50 },
    settings:    {
      isPrivate: { type: Boolean, default: false },
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Room', roomSchema);
