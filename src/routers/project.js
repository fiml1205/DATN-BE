// routers/project.js
const express = require('express');
const router = express.Router();
const path = require('path');
const functions = require('../services/functions');
const controller = require('../controllers/project');
const formData = require('express-form-data');

router.post('/saveProject', formData.parse(), controller.saveProject);
router.get('/:projectId', controller.getProject);

router.post(
  '/:projectId/convert',
  // functions.checkToken,
  functions.uploadFile(path.join(__dirname, '../public/uploads/panorama'), 1),
  controller.convertPanoramaForProject
);

module.exports = router;