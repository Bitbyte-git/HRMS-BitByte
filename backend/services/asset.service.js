const Asset = require('../models/Asset.model');
const AssetAssignment = require('../models/AssetAssignment.model');
const AssetAgreement = require('../models/AssetAgreement.model');
const AssetAuditLog = require('../models/AssetAuditLog.model');
const EmployeeProfile = require('../models/EmployeeProfile.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const notificationService = require('./notification.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { cloudinary } = require('../config/cloudinary');

const COMPANY_DETAILS = {
  name: process.env.COMPANY_NAME || 'BitByte Tech',
  address: process.env.COMPANY_ADDRESS || 'Corporate Office',
  cityPincode: process.env.COMPANY_CITY_PINCODE || 'India',
  logoUrl: process.env.COMPANY_LOGO_URL || '/logo.png',
};

const sanitize = (value) => (value === undefined || value === null ? '' : String(value).trim());

const getEmployeeName = (profile) => {
  const personalName = `${profile.personalDetails?.firstName || ''} ${profile.personalDetails?.lastName || ''}`.trim();
  const userName = `${profile.userId?.firstName || ''} ${profile.userId?.lastName || ''}`.trim();
  return personalName || userName || 'Employee';
};

const getDesignation = (profile) =>
  profile.careerDetails?.position || profile.position || profile.appliedPosition || '';

const mapFile = (file) => ({
  originalName: file.originalname,
  fileName: file.filename,
  fileUrl: file.path,
  publicId: file.filename,
  mimeType: file.mimetype,
  sizeBytes: file.size,
  uploadedAt: new Date(),
});

const uploadSignedFileToCloudinary = (file, user) => new Promise((resolve, reject) => {
  if (!file?.buffer) {
    return reject(new AppError('Signed agreement file is required.', 400));
  }

  const folder = `employee-onboarding/${user.id || user._id}/asset-agreements`;
  const startedAt = Date.now();
  let uploadStream;

  const timer = setTimeout(() => {
    if (uploadStream?.destroy) uploadStream.destroy();
    reject(new AppError('Cloudinary upload timed out while saving the signed agreement. Please try again.', 504));
  }, 45000);

  uploadStream = cloudinary.uploader.upload_stream(
    {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'auto',
      public_id: `signedAgreement_${Date.now()}`,
    },
    (err, result) => {
      clearTimeout(timer);

      if (err) {
        logger.error(`Signed agreement Cloudinary upload failed: ${err.message}`);
        reject(new AppError(err.message || 'Signed agreement upload failed.', 502));
        return;
      }

      logger.info(`Signed agreement uploaded to Cloudinary in ${Date.now() - startedAt}ms`);
      resolve({
        originalname: file.originalname,
        filename: result.public_id,
        path: result.secure_url || result.url,
        mimetype: file.mimetype,
        size: file.size || result.bytes,
      });
    },
  );

  uploadStream.end(file.buffer);
});

class AssetService {
  async nextSequence(prefix, Model, field) {
    const year = new Date().getFullYear();
    const count = await Model.countDocuments({ [field]: new RegExp(`^${prefix}-${year}-`) });
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async log(user, action, refs = {}, metadata = {}) {
    try {
      await AssetAuditLog.create({
        userId: user._id,
        action,
        ...refs,
        metadata,
      });
    } catch (err) {
      logger.error(`Asset audit log failed: ${err.message}`);
    }
  }

  async notifyAdmins(type, subject, body, metadata = {}) {
    const admins = await User.find({
      role: { $in: ['admin', 'super_admin'] },
      status: 'active',
      isDeleted: false,
    }).select('_id');

    await Promise.all(admins.map((admin) => notificationService.createNotification({
      recipientId: admin._id,
      type,
      subject,
      body,
      metadata,
    })));
  }

  async listAssets({ page = 1, limit = 10, search, category, status, assigned } = {}) {
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (assigned === 'true') query.assignedEmployeeProfileId = { $ne: null };
    if (assigned === 'false') query.assignedEmployeeProfileId = null;
    if (search) {
      query.$or = [
        { assetId: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { imeiNumber: { $regex: search, $options: 'i' } },
        { assignedEmployeeId: { $regex: search, $options: 'i' } },
        { assignedEmployeeName: { $regex: search, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Number(limit) || 10, 100);
    const safePage = Number(page) || 1;

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('createdBy', 'firstName lastName email role')
        .populate('updatedBy', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      Asset.countDocuments(query),
    ]);

    return {
      assets,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async createAsset(data, user) {
    const assetId = await this.nextSequence('AST', Asset, 'assetId');
    const asset = await Asset.create({
      assetId,
      productName: sanitize(data.productName),
      category: sanitize(data.category),
      brand: sanitize(data.brand),
      model: sanitize(data.model),
      serialNumber: sanitize(data.serialNumber),
      imeiNumber: sanitize(data.imeiNumber),
      specification: sanitize(data.specification),
      status: data.status || 'Available',
      createdBy: user._id,
      updatedBy: user._id,
    });

    await this.log(user, 'Asset Created', { assetId: asset._id }, { assetCode: asset.assetId });
    return asset;
  }

  async updateAsset(id, data, user) {
    const asset = await Asset.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);

    const editable = [
      'productName',
      'category',
      'brand',
      'model',
      'serialNumber',
      'imeiNumber',
      'specification',
      'status',
    ];

    editable.forEach((field) => {
      if (data[field] !== undefined) asset[field] = field === 'status' ? data[field] : sanitize(data[field]);
    });

    if (asset.status === 'Available') {
      asset.assignedEmployeeProfileId = null;
      asset.assignedUserId = null;
      asset.assignedEmployeeId = '';
      asset.assignedEmployeeName = '';
    }

    asset.updatedBy = user._id;
    await asset.save();
    await this.log(user, 'Asset Updated', { assetId: asset._id }, { assetCode: asset.assetId });
    return asset;
  }

  async deleteAsset(id, user) {
    const asset = await Asset.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);
    if (asset.status === 'Assigned') {
      throw new AppError('Assigned assets cannot be deleted. Return the asset first.', 400);
    }

    asset.isDeleted = true;
    asset.deletedAt = new Date();
    asset.updatedBy = user._id;
    await asset.save();
    await this.log(user, 'Asset Deleted', { assetId: asset._id }, { assetCode: asset.assetId });
    return asset;
  }

  async searchEmployees({ search = '', limit = 12 } = {}) {
    const query = {
      employeeId: { $exists: true, $ne: null },
      overallStatus: 'approved',
    };
    if (search) {
      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { 'personalDetails.firstName': { $regex: search, $options: 'i' } },
        { 'personalDetails.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const profiles = await EmployeeProfile.find(query)
      .populate('userId', 'firstName lastName email status')
      .sort({ employeeId: 1 })
      .limit(Math.min(Number(limit) || 12, 25))
      .lean();

    return profiles.map((profile) => this.mapEmployee(profile));
  }

  async getEmployeeByEmployeeId(employeeId) {
    const profile = await EmployeeProfile.findOne({ employeeId })
      .populate('userId', 'firstName lastName email status')
      .lean();
    if (!profile) throw new AppError('Employee not found for the selected Employee ID.', 404);
    return this.mapEmployee(profile);
  }

  mapEmployee(profile) {
    return {
      profileId: profile._id,
      userId: profile.userId?._id || profile.userId,
      employeeId: profile.employeeId,
      employeeName: getEmployeeName(profile),
      department: profile.department || '',
      designation: getDesignation(profile),
      position: profile.position || profile.appliedPosition || '',
      email: profile.userId?.email || '',
      phone: profile.personalDetails?.mobile || '',
    };
  }

  async getAvailableAssets() {
    return Asset.find({ status: 'Available' }).sort({ productName: 1, assetId: 1 }).lean();
  }

  buildAgreementPayload(assignment, agreement) {
    return {
      company: COMPANY_DETAILS,
      agreement: {
        agreementNumber: agreement.agreementNumber,
        agreementDate: agreement.generatedDate,
        status: agreement.status,
      },
      employee: {
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        department: assignment.department,
        designation: assignment.designation,
        position: assignment.position,
        email: assignment.email,
        phone: assignment.phone,
      },
      asset: {
        assetId: assignment.assetCode,
        productName: assignment.productName,
        category: assignment.category,
        serialNumber: assignment.serialNumber,
        imeiNumber: assignment.imeiNumber,
        specification: assignment.specification,
      },
      assignment: {
        assignmentId: assignment.assignmentId,
        assignedDate: assignment.assignedDate,
      },
      terms: [
        'The employee accepts responsibility for the assigned company asset and will use it only for authorized business purposes.',
        'The asset must be returned to the company on request, separation, role change, or completion of assignment.',
        'Loss, theft, or damage must be reported immediately to HR or the reporting manager.',
        'Damage caused by negligence, misuse, or unauthorized handling may be recoverable as per company policy.',
      ],
      signatures: {
        employee: 'Employee Signature',
        company: 'Authorized Company Signature',
      },
    };
  }

  async generateAgreement(assignmentId, user) {
    const assignment = await AssetAssignment.findById(assignmentId);
    if (!assignment) throw new AppError('Assignment not found', 404);

    let agreement = await AssetAgreement.findOne({ assignmentId: assignment._id });
    if (!agreement) {
      const agreementNumber = await this.nextSequence('AGR', AssetAgreement, 'agreementNumber');
      agreement = await AssetAgreement.create({
        agreementNumber,
        assignmentId: assignment._id,
        employeeProfileId: assignment.employeeProfileId,
        userId: assignment.userId,
        employeeId: assignment.employeeId,
        assetId: assignment.assetId,
        assetCode: assignment.assetCode,
        status: 'Pending Signature',
        generatedBy: user._id,
        generatedDate: new Date(),
      });
    }

    agreement.agreementPayload = this.buildAgreementPayload(assignment.toObject(), agreement.toObject());
    await agreement.save();

    await this.log(
      user,
      'Agreement Generated',
      { assetId: assignment.assetId, assignmentId: assignment._id, agreementId: agreement._id, employeeProfileId: assignment.employeeProfileId },
      { agreementNumber: agreement.agreementNumber },
    );

    notificationService.createNotification({
      recipientId: agreement.userId,
      type: 'asset_agreement_generated',
      subject: 'Asset Agreement Generated',
      body: `Your asset agreement for ${assignment.productName} is ready to download and sign.`,
      metadata: { agreementId: agreement._id, assignmentId: assignment._id },
    }).catch((err) => logger.error(`Agreement notification failed: ${err.message}`));

    return agreement;
  }

  async assignAsset({ employeeId, assetId }, user) {
    const profile = await EmployeeProfile.findOne({ employeeId })
      .populate('userId', 'firstName lastName email status');
    if (!profile) throw new AppError('Employee not found for the selected Employee ID.', 404);
    if (profile.overallStatus !== 'approved') {
      throw new AppError('Assets can only be assigned to approved employees.', 400);
    }

    const assetQuery = mongoose.Types.ObjectId.isValid(assetId)
      ? { $or: [{ _id: assetId }, { assetId }] }
      : { assetId };
    const asset = await Asset.findOne(assetQuery);
    if (!asset) throw new AppError('Asset not found', 404);
    if (asset.status !== 'Available') {
      throw new AppError('Only available assets can be assigned.', 400);
    }

    const employee = this.mapEmployee(profile.toObject());
    const assignmentId = await this.nextSequence('ASG', AssetAssignment, 'assignmentId');

    const assignment = await AssetAssignment.create({
      assignmentId,
      employeeProfileId: profile._id,
      userId: profile.userId._id,
      employeeId: profile.employeeId,
      employeeName: employee.employeeName,
      department: employee.department,
      designation: employee.designation,
      position: employee.position,
      email: employee.email,
      phone: employee.phone,
      assetId: asset._id,
      assetCode: asset.assetId,
      productName: asset.productName,
      category: asset.category,
      serialNumber: asset.serialNumber,
      imeiNumber: asset.imeiNumber,
      specification: asset.specification,
      assignedBy: user._id,
      assignedDate: new Date(),
      status: 'Assigned',
    });

    asset.status = 'Assigned';
    asset.assignedEmployeeProfileId = profile._id;
    asset.assignedUserId = profile.userId._id;
    asset.assignedEmployeeId = profile.employeeId;
    asset.assignedEmployeeName = employee.employeeName;
    asset.updatedBy = user._id;
    await asset.save();

    const agreement = await this.generateAgreement(assignment._id, user);

    await this.log(
      user,
      'Asset Assigned',
      { assetId: asset._id, assignmentId: assignment._id, agreementId: agreement._id, employeeProfileId: profile._id },
      { employeeId: profile.employeeId, assetCode: asset.assetId },
    );

    notificationService.createNotification({
      recipientId: profile.userId._id,
      type: 'asset_assigned',
      subject: 'Asset Assigned',
      body: `${asset.productName} (${asset.assetId}) has been assigned to you.`,
      metadata: { assetId: asset._id, assignmentId: assignment._id },
    }).catch((err) => logger.error(`Asset assignment notification failed: ${err.message}`));

    return { assignment, asset, agreement };
  }

  async listAssignments({ page = 1, limit = 10, search, status, mineUserId } = {}) {
    const query = {};
    if (mineUserId) query.userId = mineUserId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { assignmentId: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { assetCode: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Number(limit) || 10, 100);
    const safePage = Number(page) || 1;

    const [assignments, total] = await Promise.all([
      AssetAssignment.find(query)
        .populate('assignedBy', 'firstName lastName email role')
        .populate('returnedBy', 'firstName lastName email role')
        .sort({ assignedDate: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      AssetAssignment.countDocuments(query),
    ]);

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const agreements = await AssetAgreement.find({ assignmentId: { $in: assignmentIds } }).lean();
    const byAssignment = new Map(agreements.map((agreement) => [String(agreement.assignmentId), agreement]));

    return {
      assignments: assignments.map((assignment) => ({
        ...assignment,
        agreement: byAssignment.get(String(assignment._id)) || null,
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getAgreementPayload(agreementId, user) {
    const agreement = await AssetAgreement.findById(agreementId).lean();
    if (!agreement) throw new AppError('Agreement not found', 404);
    if (['employee', 'intern'].includes(user.role) && String(agreement.userId) !== String(user._id)) {
      throw new AppError('You can only view your own asset agreements.', 403);
    }

    const assignment = await AssetAssignment.findById(agreement.assignmentId).lean();
    return {
      agreement,
      payload: agreement.agreementPayload?.agreement ? agreement.agreementPayload : this.buildAgreementPayload(assignment, agreement),
    };
  }

  async uploadSignedAgreement(agreementId, file, user) {
    if (!file) throw new AppError('Signed agreement file is required.', 400);
    const agreement = await AssetAgreement.findById(agreementId);
    if (!agreement) throw new AppError('Agreement not found', 404);
    if (String(agreement.userId) !== String(user._id)) {
      throw new AppError('You can only upload your own signed agreement.', 403);
    }
    if (!['Pending Signature', 'Rejected'].includes(agreement.status)) {
      throw new AppError(`Signed agreement cannot be uploaded while status is ${agreement.status}.`, 400);
    }

    const storedFile = file.path ? file : await uploadSignedFileToCloudinary(file, user);

    agreement.signedFile = mapFile(storedFile);
    agreement.signedPdfUrl = storedFile.path;
    agreement.uploadedDate = new Date();
    agreement.status = 'Signed Uploaded';
    agreement.rejectionReason = '';
    await agreement.save();

    await this.log(
      user,
      'Agreement Uploaded',
      { assetId: agreement.assetId, assignmentId: agreement.assignmentId, agreementId: agreement._id, employeeProfileId: agreement.employeeProfileId },
      { agreementNumber: agreement.agreementNumber },
    );

    this.notifyAdmins(
      'asset_signed_agreement_uploaded',
      'Signed Asset Agreement Uploaded',
      `${agreement.employeeId} uploaded a signed asset agreement for verification.`,
      { agreementId: agreement._id },
    ).catch((err) => logger.error(`Signed agreement admin notification failed: ${err.message}`));

    return agreement;
  }

  async verifyAgreement(agreementId, { action, comments }, user) {
    const agreement = await AssetAgreement.findById(agreementId);
    if (!agreement) throw new AppError('Agreement not found', 404);
    if (agreement.status !== 'Signed Uploaded') {
      throw new AppError('Only uploaded signed agreements can be verified.', 400);
    }

    agreement.status = action === 'approve' ? 'Verified' : 'Rejected';
    agreement.verifiedBy = user._id;
    agreement.verifiedDate = new Date();
    agreement.rejectionReason = action === 'reject' ? sanitize(comments) : '';
    await agreement.save();

    await this.log(
      user,
      action === 'approve' ? 'Agreement Verified' : 'Agreement Rejected',
      { assetId: agreement.assetId, assignmentId: agreement.assignmentId, agreementId: agreement._id, employeeProfileId: agreement.employeeProfileId },
      { agreementNumber: agreement.agreementNumber, comments },
    );

    notificationService.createNotification({
      recipientId: agreement.userId,
      type: action === 'approve' ? 'asset_agreement_approved' : 'asset_agreement_rejected',
      subject: action === 'approve' ? 'Asset Agreement Approved' : 'Asset Agreement Rejected',
      body: action === 'approve'
        ? 'Your signed asset agreement has been verified.'
        : `Your signed asset agreement was rejected.${comments ? ` Reason: ${comments}` : ''}`,
      metadata: { agreementId: agreement._id },
    }).catch((err) => logger.error(`Agreement verification notification failed: ${err.message}`));

    return agreement;
  }

  async returnAsset(assignmentId, { returnDate, assetCondition, returnNotes }, user) {
    const assignment = await AssetAssignment.findById(assignmentId);
    if (!assignment) throw new AppError('Assignment not found', 404);
    if (assignment.status !== 'Assigned') {
      throw new AppError('Only active assigned assets can be returned.', 400);
    }

    const asset = await Asset.findById(assignment.assetId);
    if (!asset) throw new AppError('Asset not found', 404);

    const condition = assetCondition || 'Good';
    assignment.returnDate = returnDate ? new Date(returnDate) : new Date();
    assignment.returnCondition = condition;
    assignment.returnNotes = sanitize(returnNotes);
    assignment.returnedBy = user._id;
    assignment.status = condition === 'Lost' ? 'Lost' : condition === 'Damaged' ? 'Damaged' : 'Returned';
    await assignment.save();

    asset.status = condition === 'Lost' ? 'Lost' : condition === 'Damaged' ? 'Damaged' : 'Returned';
    asset.assignedEmployeeProfileId = null;
    asset.assignedUserId = null;
    asset.assignedEmployeeId = '';
    asset.assignedEmployeeName = '';
    asset.updatedBy = user._id;
    await asset.save();

    await this.log(
      user,
      'Asset Returned',
      { assetId: asset._id, assignmentId: assignment._id, employeeProfileId: assignment.employeeProfileId },
      { condition, returnNotes },
    );

    this.notifyAdmins(
      'asset_returned',
      'Asset Returned',
      `${assignment.productName} (${assignment.assetCode}) was returned by ${assignment.employeeName}.`,
      { assignmentId: assignment._id, assetId: asset._id },
    ).catch((err) => logger.error(`Asset return notification failed: ${err.message}`));

    return { assignment, asset };
  }

  async getAuditTrail({ assetId, assignmentId, agreementId, employeeProfileId } = {}) {
    const query = {};
    if (assetId) query.assetId = assetId;
    if (assignmentId) query.assignmentId = assignmentId;
    if (agreementId) query.agreementId = agreementId;
    if (employeeProfileId) query.employeeProfileId = employeeProfileId;

    return AssetAuditLog.find(query)
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }
}

module.exports = new AssetService();
