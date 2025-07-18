const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  projectId: { type: Number, required: true },
  userId: { type: Number, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
