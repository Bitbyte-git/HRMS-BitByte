const mongoose = require('mongoose');

const AGREEMENT_STATUSES = ['Pending Signature', 'Signed Uploaded', 'Verified', 'Rejected'];

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String },
    fileName: { type: String },
    fileUrl: { type: String },
    publicId: { type: String },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const approvalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    comments: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  { _id: false },
);

const assetAgreementSchema = new mongoose.Schema(
  {
    agreementNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetAssignment',
      required: true,
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
    agreementPdfUrl: {
      type: String,
      trim: true,
      default: '',
    },
    signedPdfUrl: {
      type: String,
      trim: true,
      default: '',
    },
    signedFile: {
      type: fileSchema,
      default: null,
    },
    adminApproval: {
      type: approvalSchema,
      default: () => ({ status: 'pending' }),
    },
    superAdminApproval: {
      type: approvalSchema,
      default: () => ({ status: 'pending' }),
    },
    status: {
      type: String,
      enum: AGREEMENT_STATUSES,
      default: 'Pending Signature',
      index: true,
    },
    agreementPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    generatedDate: {
      type: Date,
      default: Date.now,
    },
    uploadedDate: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

assetAgreementSchema.index({ employeeId: 1, status: 1, generatedDate: -1 });
assetAgreementSchema.index({ assignmentId: 1 }, { unique: true });

module.exports = mongoose.model('AssetAgreement', assetAgreementSchema);
module.exports.AGREEMENT_STATUSES = AGREEMENT_STATUSES;
