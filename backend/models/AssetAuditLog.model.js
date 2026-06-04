const mongoose = require('mongoose');

const assetAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      index: true,
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetAssignment',
      index: true,
    },
    agreementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetAgreement',
      index: true,
    },
    employeeProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

assetAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AssetAuditLog', assetAuditLogSchema);
