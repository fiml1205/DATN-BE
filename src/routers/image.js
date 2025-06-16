// routers/project.js
const express = require('express');
const router = express.Router();
const path = require('path');
const functions = require('../services/functions');
const controller = require('../controllers/image');
const formData = require('express-form-data');

router.post('/sliceImage360', functions.uploadFile(path.join(__dirname, '../public/uploads/equirect'), 1), controller.sliceImage360);
router.post('/deleteImage', formData.parse(), controller.deleteImage);

module.exports = router;