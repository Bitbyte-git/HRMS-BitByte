const mongoose = require('mongoose');

const ASSIGNMENT_STATUSES = ['Assigned', 'Returned', 'Lost', 'Damaged'];

const assetAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    employeeProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    designation: {
      type: String,
      trim: true,
      default: '',
    },
    position: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    assetCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    serialNumber: {
      type: String,
      trim: true,
      default: '',
    },
    imeiNumber: {
      type: String,
      trim: true,
      default: '',
    },
    specification: {
      type: String,
      trim: true,
      default: '',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    returnCondition: {
      type: String,
      enum: ['Good', 'Damaged', 'Lost', ''],
      default: '',
    },
    returnNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: 'Assigned',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

assetAssignmentSchema.index({ employeeId: 1, status: 1, assignedDate: -1 });
assetAssignmentSchema.index({ assetId: 1, status: 1 });

module.exports = mongoose.model('AssetAssignment', assetAssignmentSchema);
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES;
