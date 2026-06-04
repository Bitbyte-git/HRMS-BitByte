const assetService = require('../services/asset.service');
const catchAsync = require('../utils/catchAsync');

exports.listAssets = catchAsync(async (req, res) => {
  const data = await assetService.listAssets(req.query);
  res.status(200).json({ status: 'success', data });
});

exports.createAsset = catchAsync(async (req, res) => {
  const asset = await assetService.createAsset(req.body, req.user);
  res.status(201).json({ status: 'success', message: 'Asset created successfully.', data: { asset } });
});

exports.updateAsset = catchAsync(async (req, res) => {
  const asset = await assetService.updateAsset(req.params.id, req.body, req.user);
  res.status(200).json({ status: 'success', message: 'Asset updated successfully.', data: { asset } });
});

exports.deleteAsset = catchAsync(async (req, res) => {
  await assetService.deleteAsset(req.params.id, req.user);
  res.status(200).json({ status: 'success', message: 'Asset deleted successfully.' });
});

exports.searchEmployees = catchAsync(async (req, res) => {
  const employees = await assetService.searchEmployees(req.query);
  res.status(200).json({ status: 'success', data: { employees } });
});

exports.getEmployeeByEmployeeId = catchAsync(async (req, res) => {
  const employee = await assetService.getEmployeeByEmployeeId(req.params.employeeId);
  res.status(200).json({ status: 'success', data: { employee } });
});

exports.getAvailableAssets = catchAsync(async (req, res) => {
  const assets = await assetService.getAvailableAssets();
  res.status(200).json({ status: 'success', data: { assets } });
});

exports.assignAsset = catchAsync(async (req, res) => {
  const data = await assetService.assignAsset(req.body, req.user);
  res.status(201).json({ status: 'success', message: 'Asset assigned successfully.', data });
});

exports.listAssignments = catchAsync(async (req, res) => {
  const data = await assetService.listAssignments(req.query);
  res.status(200).json({ status: 'success', data });
});

exports.listMyAssignments = catchAsync(async (req, res) => {
  const data = await assetService.listAssignments({ ...req.query, mineUserId: req.user._id });
  res.status(200).json({ status: 'success', data });
});

exports.generateAgreement = catchAsync(async (req, res) => {
  const agreement = await assetService.generateAgreement(req.params.assignmentId, req.user);
  res.status(200).json({ status: 'success', message: 'Agreement generated successfully.', data: { agreement } });
});

exports.getAgreement = catchAsync(async (req, res) => {
  const data = await assetService.getAgreementPayload(req.params.agreementId, req.user);
  res.status(200).json({ status: 'success', data });
});

exports.uploadSignedAgreement = catchAsync(async (req, res) => {
  const agreement = await assetService.uploadSignedAgreement(req.params.agreementId, req.file, req.user);
  res.status(200).json({ status: 'success', message: 'Signed agreement uploaded successfully.', data: { agreement } });
});

exports.verifyAgreement = catchAsync(async (req, res) => {
  const agreement = await assetService.verifyAgreement(req.params.agreementId, req.body, req.user);
  res.status(200).json({ status: 'success', message: 'Agreement verification updated.', data: { agreement } });
});

exports.returnAsset = catchAsync(async (req, res) => {
  const data = await assetService.returnAsset(req.params.assignmentId, req.body, req.user);
  res.status(200).json({ status: 'success', message: 'Asset return recorded successfully.', data });
});

exports.getAuditTrail = catchAsync(async (req, res) => {
  const logs = await assetService.getAuditTrail(req.query);
  res.status(200).json({ status: 'success', data: { logs } });
});
