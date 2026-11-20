const express = require('express');
const router = express.Router();
const flowController = require('../controllers/flow.controller');

// POST /whatsapp/flow-endpoint (WhatsApp Flow submissions)
router.post('/flow-endpoint', flowController.handleFlowSubmission);

module.exports = router;
