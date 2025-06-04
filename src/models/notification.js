const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  projectId: String,
  projectName: String,
  userIdTour: String,
  userId: String,
  message: String,
  isRead: { type: Boolean, default: false },
  createdAt: Date,
});

module.exports = mongoose.model('Notification', notificationSchema);
