const ChatbotQuestion = require('../models/ChatbotQuestion.model');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const roleScopeMap = {
  employee: 'employee',
  intern: 'employee',
  admin: 'admin',
  super_admin: 'super_admin',
};

exports.getQuestions = catchAsync(async (req, res, next) => {
  const roleScope = roleScopeMap[req.user?.role];

  if (!roleScope) {
    return next(new AppError('Your account role cannot access the assistant.', 403));
  }

  const questions = await ChatbotQuestion.find({
    isActive: true,
    allowedRoles: roleScope,
  })
    .select('text answer moduleLabel actionPath sortOrder')
    .sort({ sortOrder: 1, text: 1 })
    .lean();

  res.status(200).json({
    status: 'success',
    data: {
      questions: questions.map((question) => ({
        id: String(question._id),
        text: question.text,
        answer: question.answer,
        moduleLabel: question.moduleLabel,
        actionPath: question.actionPath,
      })),
    },
  });
});
