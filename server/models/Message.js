const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId:         { type: String, required: true, index: true },
    tempId:         { type: String, default: null, index: true },
    senderId:       { type: String, required: true },
    senderName:     { type: String, required: true },
    senderUsername: { type: String, default: null },
    senderPhotoURL: { type: String, default: null },
    isAi:           { type: Boolean, default: false },
    type:           { type: String, enum: ['text', 'image', 'file', 'voice'], default: 'text' },
    text:           { type: String, default: '' },
    fileUrl:        { type: String, default: null },
    fileName:       { type: String, default: null },
    fileSize:       { type: Number, default: null },
    fileDuration:   { type: Number, default: null },
    reactions:      { type: mongoose.Schema.Types.Mixed, default: {} },
    reactionUsers:  { type: mongoose.Schema.Types.Mixed, default: {} },
    replyTo:        { type: mongoose.Schema.Types.Mixed, default: null },
    editedAt:       { type: Date, default: null },
  },
  {
    timestamps: true,         
    versionKey: false,
  }
);

messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
