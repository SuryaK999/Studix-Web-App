const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    roomId:    { type: String, required: true, unique: true },
    content:   { type: String, default: '<p>Start collaborating on notes...</p>' },
    updatedBy: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Note', noteSchema);

