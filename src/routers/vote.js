const express = require('express');
const router = express.Router();
const voteController = require('../controllers/vote');
const functions = require('../services/functions');

router.post('/submit', functions.checkToken, voteController.createOrUpdateVote);
router.get('/:projectId', voteController.getProjectVotes);

module.exports = router;