const mongoose = require('mongoose');

const ASSET_STATUSES = ['Available', 'Assigned', 'Returned', 'Damaged', 'Lost'];

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    model: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    serialNumber: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
      index: true,
    },
    imeiNumber: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
      index: true,
    },
    specification: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: ASSET_STATUSES,
      default: 'Available',
      index: true,
    },
    assignedEmployeeProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
      default: null,
      index: true,
    },
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedEmployeeId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    assignedEmployeeName: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

assetSchema.index({
  assetId: 'text',
  productName: 'text',
  category: 'text',
  serialNumber: 'text',
  imeiNumber: 'text',
  assignedEmployeeId: 'text',
  assignedEmployeeName: 'text',
});

assetSchema.pre(/^find/, function (next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Asset', assetSchema);
module.exports.ASSET_STATUSES = ASSET_STATUSES;
