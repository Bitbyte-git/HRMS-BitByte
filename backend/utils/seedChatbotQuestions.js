require('dotenv').config();
const mongoose = require('mongoose');
const ChatbotQuestion = require('../models/ChatbotQuestion.model');
const logger = require('./logger');

const questions = [
  {
    text: 'How do I log my Attendance?',
    answer: 'Open the Attendance module from your portal menu to review your daily attendance status and attendance history.',
    allowedRoles: ['employee'],
    moduleLabel: 'Attendance',
    actionPath: '/employee/dashboard',
    sortOrder: 10,
  },
  {
    text: 'How do I request a new Asset?',
    answer: 'Go to My Assets to view your assigned assets and submit asset-related requests to HR or IT support.',
    allowedRoles: ['employee'],
    moduleLabel: 'Assets',
    actionPath: '/employee/assets',
    sortOrder: 20,
  },
  {
    text: 'Where can I find company policies?',
    answer: 'Company policy updates are surfaced from the Dashboard. Check the Dashboard for HR announcements and policy guidance.',
    allowedRoles: ['employee'],
    moduleLabel: 'Dashboard',
    actionPath: '/employee/dashboard',
    sortOrder: 30,
  },
  {
    text: 'Where do I see Pending Approvals?',
    answer: 'Use the Pending Approvals view to review employee onboarding submissions and items waiting for admin action.',
    allowedRoles: ['admin'],
    moduleLabel: 'Pending Approvals',
    actionPath: '/admin/employees',
    sortOrder: 40,
  },
  {
    text: "How do I view a specific employee's profile?",
    answer: 'Open the Employees directory, search for the employee, and select their row to view profile, documents, and verification details.',
    allowedRoles: ['admin'],
    moduleLabel: 'All Employees',
    actionPath: '/admin/employees',
    sortOrder: 50,
  },
  {
    text: "How do I check today's team attendance?",
    answer: "Open the Attendance module to view today's team attendance, present/absent counts, and employee-level status.",
    allowedRoles: ['admin'],
    moduleLabel: 'Attendance',
    actionPath: '/admin/attendance',
    sortOrder: 60,
  },
  {
    text: 'How do I manage Admin permissions?',
    answer: 'Go to Admin Management to create admins, promote super admins, and update admin account status.',
    allowedRoles: ['super_admin'],
    moduleLabel: 'Admin Management',
    actionPath: '/super-admin/admins',
    sortOrder: 70,
  },
  {
    text: 'Where are the monthly financial overviews?',
    answer: 'Open Payroll Reports to review payroll totals, monthly summaries, and salary-related reporting.',
    allowedRoles: ['super_admin'],
    moduleLabel: 'Payroll Reports',
    actionPath: '/super-admin/payroll',
    sortOrder: 80,
  },
  {
    text: 'Where can I view company-wide turnover rates?',
    answer: 'Use Analytics to view company-wide workforce metrics, trends, and turnover-related insights.',
    allowedRoles: ['super_admin'],
    moduleLabel: 'Analytics',
    actionPath: '/super-admin/analytics',
    sortOrder: 90,
  },
];

const seedChatbotQuestions = async () => {
  await Promise.all(
    questions.map((question) =>
      ChatbotQuestion.findOneAndUpdate(
        { text: question.text },
        { $set: question },
        { upsert: true, new: true, runValidators: true },
      ),
    ),
  );

  logger.info(`Chatbot questions ready: ${questions.length} configured`);
};

const runStandaloneSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB for chatbot question seeding');

    await seedChatbotQuestions();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Chatbot question seed failed: ${err.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  runStandaloneSeed();
}

module.exports = {
  CHATBOT_QUESTIONS: questions,
  seedChatbotQuestions,
};
