// backend/routes/adminRoutes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// POST /api/admin/register
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  adminController.register
);

// POST /api/admin/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  adminController.login
);

// GET /api/admin/users
router.get('/users', auth, adminController.users);

module.exports = router;
