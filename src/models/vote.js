const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  projectId: { type: Number, required: true },
  userId: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  createdAt: { type: Date, default: Date.now }
});

voteSchema.index({ projectId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);