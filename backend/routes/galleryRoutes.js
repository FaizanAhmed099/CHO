// backend/routes/galleryRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/galleryController');
const auth = require('../middleware/auth');
const { uploadSingleGalleryImage } = require('../utils/upload');

// Public
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Admin protected
router.post('/', auth, uploadSingleGalleryImage, ctrl.create); // single
router.put('/:id', auth, uploadSingleGalleryImage, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
