const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
  position: {
    type: [Number],
    required: true,
  },
  label: String,
  targetSceneId: String,
});

const sceneSchema = new mongoose.Schema({
  id: String,
  original: String,
  cubePaths: [String],
  audio: String,
  hotspots: [hotspotSchema],
  isFirst: Boolean
});

const tourStepSchema = new mongoose.Schema({
  day: Number,
  content: String,
});

const projectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  userId: String,
  title: String,
  description: String,
  departureDate: String,
  price: Number,
  tourSteps: [tourStepSchema],
  scenes: [sceneSchema],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
