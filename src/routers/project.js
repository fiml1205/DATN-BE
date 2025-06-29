const express = require('express');
const router = express.Router();
const path = require('path');
const functions = require('../services/functions');
const controller = require('../controllers/project');
const formData = require('express-form-data');

router.post('/create', formData.parse(), controller.createProject);
router.post('/update', formData.parse(), controller.updateProject);
router.post('/edit/:projectId', formData.parse(), controller.editProject);
router.post('/getListProject', controller.getListProject);
router.post('/getListProjectOwn', functions.checkToken, controller.getListProjectOwn);
router.get('/search', controller.searchProjects);
router.get('/:projectId', functions.checkTokenOptional, controller.getProject);

module.exports = router;