// backend/routes/bulkImagesRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/bulkImagesController');
const auth = require('../middleware/auth');
const { uploadBulkImages } = require('../utils/upload');

// Public
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Admin protected
router.post('/', auth, uploadBulkImages, ctrl.create);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
