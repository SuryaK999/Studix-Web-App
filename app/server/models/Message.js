const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId:         { type: String, required: true, index: true },
    senderId:       { type: String, required: true },
    senderName:     { type: String, required: true },
    senderPhotoURL: { type: String, default: null },
    type:           { type: String, enum: ['text', 'image', 'file', 'voice'], default: 'text' },
    text:           { type: String, default: '' },
    fileUrl:        { type: String, default: null },
    fileName:       { type: String, default: null },
    fileSize:       { type: Number, default: null },
    fileDuration:   { type: Number, default: null },
    reactions:      { type: mongoose.Schema.Types.Mixed, default: {} },
    reactionUsers:  { type: mongoose.Schema.Types.Mixed, default: {} },
    editedAt:       { type: Date, default: null },
  },
  {
    timestamps: true,         
    versionKey: false,
  }
);

messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
