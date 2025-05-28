const express = require("express");
const router = express.Router();
const formData = require('express-form-data');
const functions = require('../services/functions')
const controller = require('../controllers/admin')
const path = require('path');
const { uploadFile } = require('../services/functions.js');

// router.post('/listUsers',functions.checkToken, formData.parse(), controller.listUsers);
router.post('/listUsers', formData.parse(), controller.listUser);

module.exports = router