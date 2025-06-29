const express = require("express");
const router = express.Router();
const formData = require('express-form-data');
const functions = require('../services/functions.js')
const controller = require('../controllers/user.js')

router.post('/login', controller.login);
router.post('/register', formData.parse(), controller.register);
router.post('/getInfor', functions.checkToken, formData.parse(), controller.getInfor);
router.post('/getComments', formData.parse(), controller.getComments);
router.post('/comment', formData.parse(), controller.comment);
router.put('/update', functions.checkToken, controller.updateUser);
router.post('/avatar', functions.checkToken, functions.uploadAvatar, controller.uploadAvatar);
router.put('/change-password', functions.checkToken, controller.changePassword);

module.exports = router