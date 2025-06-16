const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment');
const { checkToken } = require('../services/functions');

router.post('/', checkToken, commentController.createComment);
router.get('/:projectId', commentController.getCommentsByProject);
router.put('/:id', checkToken, commentController.updateComment);
router.delete('/:id', checkToken, commentController.deleteComment);

module.exports = router;