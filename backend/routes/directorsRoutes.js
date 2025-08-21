// backend/routes/directorsRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/directorsController');
const auth = require('../middleware/auth');
const { uploadDirectorImage } = require('../utils/upload');

// Public
router.get('/', ctrl.getAll);
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/:id', ctrl.getById);

// Admin protected
router.post('/', auth, uploadDirectorImage, ctrl.create);
router.put('/:id', auth, uploadDirectorImage, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
