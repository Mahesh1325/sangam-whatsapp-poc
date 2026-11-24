const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// GET /admin/tickets - Returns ticket list & stats
router.get('/tickets', adminController.getTickets);

// GET /admin/updates - Returns member details change logs
router.get('/updates', adminController.getUpdates);

// POST /admin/tickets/:code/close & :id/close - Closes ticket & notifies member via WhatsApp
router.post(['/tickets/:code/close', '/tickets/:id/close'], adminController.closeTicket);

// Live Chat Routes
router.get('/chat/conversations', adminController.getConversations);
router.get('/chat/:phone', adminController.getChatHistory);
router.post('/chat/reply', adminController.sendLiveReply);

module.exports = router;
