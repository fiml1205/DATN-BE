const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  projectId: Number,
  projectName: String,
  userIdTour: Number,
  userId: Number,
  message: String,
  isRead: { type: Boolean, default: false },
  createdAt: Date,
});

module.exports = mongoose.model('Notification', notificationSchema);
