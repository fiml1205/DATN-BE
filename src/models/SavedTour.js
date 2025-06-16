const mongoose = require('mongoose');

const savedTourSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  projectId: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

savedTourSchema.index({ userId: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model('SavedTour', savedTourSchema);
