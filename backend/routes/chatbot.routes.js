const express = require('express');
const chatbotController = require('../controllers/chatbot.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/questions', chatbotController.getQuestions);

module.exports = router;
