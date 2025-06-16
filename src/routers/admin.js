const express = require("express");
const router = express.Router();
const functions = require('../services/functions')
const controller = require('../controllers/admin')

router.get('/users', functions.checkToken, controller.users);
router.delete('/user/:userId', functions.checkToken, controller.deleteUser);
router.put('/user/:userId', functions.checkToken, controller.updateUser);
router.get('/projects', functions.checkToken, controller.projects);
router.delete('/project/:projectId', functions.checkToken, controller.deleteProject);
router.patch('/project/:projectId/lock', functions.checkToken, controller.lockProject);

module.exports = router