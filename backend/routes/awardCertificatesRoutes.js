// backend/routes/awardCertificatesRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/awardCertificatesController');
const auth = require('../middleware/auth');
const { uploadAwardImage } = require('../utils/upload');

// Public
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Admin protected
router.post('/', auth, uploadAwardImage, ctrl.create);
router.put('/:id', auth, uploadAwardImage, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
