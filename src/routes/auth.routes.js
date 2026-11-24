const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.get('/login', authController.renderLoginPage);
router.post('/api/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;
