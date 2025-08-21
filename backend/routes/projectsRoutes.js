// backend/routes/projectsRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/projectsController');
const auth = require('../middleware/auth');
const { uploadProjectImage } = require('../utils/upload');

// Public
router.get('/', ctrl.getAll);
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/:id', ctrl.getById);

// Admin protected
router.post('/', auth, uploadProjectImage, ctrl.create);
router.put('/:id', auth, uploadProjectImage, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
