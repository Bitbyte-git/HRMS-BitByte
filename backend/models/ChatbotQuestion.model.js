const mongoose = require('mongoose');

const roleValues = ['super_admin', 'admin', 'employee'];

const chatbotQuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: 180,
      unique: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer text is required'],
      trim: true,
      maxlength: 1200,
    },
    allowedRoles: {
      type: [String],
      alias: 'allowed_roles',
      required: true,
      validate: {
        validator: (roles) =>
          Array.isArray(roles) &&
          roles.length > 0 &&
          roles.every((role) => roleValues.includes(role)),
        message: 'Allowed roles must contain employee, admin, or super_admin.',
      },
    },
    moduleLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    actionPath: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

chatbotQuestionSchema.index({ allowedRoles: 1, isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('ChatbotQuestion', chatbotQuestionSchema);
