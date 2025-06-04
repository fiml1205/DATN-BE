const express = require('express');
const router = express.Router();
const functions = require('../services/functions.js')
const notification = require('../controllers/notification');

router.post('/bookTour', functions.checkToken, notification.createNotification);
router.post('/getNoti', functions.checkToken, notification.getNoti);

module.exports = router;
