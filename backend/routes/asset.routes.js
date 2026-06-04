const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const { protect, authorize, checkFirstLogin } = require('../middlewares/auth.middleware');
const { ensureCloudinaryConfigured, createUpload } = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const signedAgreementUpload = createUpload({
  maxFileSize: 10 * 1024 * 1024,
  folderBuilder: (req) => `employee-onboarding/${req.user.id}/asset-agreements`,
});

const handleSignedAgreementUpload = (req, res, next) => {
  signedAgreementUpload.single('signedAgreement')(req, res, (err) => {
    if (!err) return next();

    const message = err.message?.includes('File too large')
      ? 'Signed agreement file must be 10 MB or smaller.'
      : err.message || 'Signed agreement upload failed.';

    return next(new AppError(message, 400));
  });
};

router.use(protect);
router.use(checkFirstLogin);

router.get('/mine', authorize('employee', 'intern'), assetController.listMyAssignments);
router.post(
  '/agreements/:agreementId/upload-signed',
  authorize('employee', 'intern'),
  ensureCloudinaryConfigured,
  handleSignedAgreementUpload,
  assetController.uploadSignedAgreement,
);

router.get('/agreements/:agreementId', authorize('admin', 'super_admin', 'employee', 'intern'), assetController.getAgreement);

router.use(authorize('admin', 'super_admin'));

router.get('/', assetController.listAssets);
router.get('/available', assetController.getAvailableAssets);
router.get('/employees/search', assetController.searchEmployees);
router.get('/employees/:employeeId', assetController.getEmployeeByEmployeeId);
router.get('/assignments', assetController.listAssignments);
router.get('/audit-trail', assetController.getAuditTrail);

router.post('/assign', authorize('admin', 'super_admin'), assetController.assignAsset);
router.post('/assignments/:assignmentId/agreement', authorize('admin', 'super_admin'), assetController.generateAgreement);
router.patch('/agreements/:agreementId/verify', authorize('admin', 'super_admin'), assetController.verifyAgreement);
router.patch('/assignments/:assignmentId/return', authorize('admin', 'super_admin'), assetController.returnAsset);

router.post('/', authorize('super_admin'), assetController.createAsset);
router.patch('/:id', authorize('super_admin'), assetController.updateAsset);
router.delete('/:id', authorize('super_admin'), assetController.deleteAsset);

module.exports = router;
