// backend/routes/clientsRoutes.js
const express = require('express');
const router = express.Router();

const clientsController = require('../controllers/clientsController');
const auth = require('../middleware/auth');
const { uploadClientLogo } = require('../utils/upload');

// Public reads
router.get('/', clientsController.getAll);
router.get('/:id', clientsController.getById);

// Protected mutations
router.post('/', auth, uploadClientLogo, clientsController.create);
router.put('/:id', auth, uploadClientLogo, clientsController.update);
router.delete('/:id', auth, clientsController.remove); // hard delete

module.exports = router;