// backend/routes/contactRoutes.js
const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const auth = require('../middleware/auth');

// Public: submit contact form
router.post('/', contactController.create);

// Admin: manage messages
router.get('/', auth, contactController.list);
router.get('/:id', auth, contactController.getById);
router.delete('/:id', auth, contactController.remove);
// Admin: send email(s) to contacts
router.post('/send-email', auth, contactController.sendEmail);

module.exports = router;
