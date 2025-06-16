const express = require("express");
const router = express.Router();
const formData = require('express-form-data');
const functions = require('../services/functions.js')
const controller = require('../controllers/user.js')
const path = require('path');
const { uploadFile } = require('../services/functions.js');

router.post('/login', formData.parse(), controller.login);
router.post('/register', formData.parse(), controller.register);
router.post('/getInfor', functions.checkToken, formData.parse(), controller.getInfor);
router.post('/getListProject', functions.checkToken, formData.parse(), controller.getListProject);
router.post('/company/updateInfor',
    functions.checkToken,
    uploadFile(path.join(__dirname, '../public/images/company/introduce'), 5),
    controller.updateInforCompany
);
router.post('/getComments', formData.parse(), controller.getComments);
router.post('/comment', formData.parse(), controller.comment);

router.put('/update', functions.checkToken, controller.updateUser);
router.post('/avatar', functions.checkToken, functions.uploadAvatar, controller.uploadAvatar);
router.put('/change-password', functions.checkToken, controller.changePassword);

module.exports = router