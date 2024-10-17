const express = require("express");
const router = express.Router();
const formData = require('express-form-data');
const functions = require('../services/functions')
const controller = require('../controllers/users')
const path = require('path');
const { uploadFile } = require('../services/functions.js');

router.post('/login', formData.parse(), controller.login);
router.post('/register', formData.parse(), controller.register);
router.post('/company/updateInfor',
    functions.checkToken,
    uploadFile(path.join(__dirname, '../public/images/company/introduce'), 5),
    controller.updateInforCompany
);

module.exports = router