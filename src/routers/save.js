const express = require('express');
const router = express.Router();
const saveController = require('../controllers/save');
const { checkToken } = require('../services/functions');

router.post('/', checkToken, saveController.toggleSave);
router.get('/', checkToken, saveController.getSavedTours);
router.get('/status/:projectId', checkToken, saveController.checkSavedStatus);

module.exports = router;