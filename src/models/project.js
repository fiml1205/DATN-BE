const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
  pitch: Number,
  yaw: Number,
  label: String,
  targetSceneId: String,
});

const sceneSchema = new mongoose.Schema({
  id: String,
  name: String,
  originalImage: String,
  tilesPath: String,
  audio: String,
  hotspots: [hotspotSchema],
  isFirst: Boolean
});

const tourStepSchema = new mongoose.Schema({
  day: String,
  content: String,
});

const projectSchema = new mongoose.Schema({
  projectId: { type: Number, required: true, unique: true },
  userId: Number,
  title: String,
  description: String,
  departureCity: Number,
  coverImage: String,
  departureDate: String,
  price: Number,
  sale: String,
  timeLastBook: Date,
  isForeign: {
    type: Boolean,
    default: false
  },
  tourSteps: [tourStepSchema],
  scenes: [sceneSchema],
  isLock: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
