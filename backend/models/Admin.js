// backend/models/Admin.js
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['admin'], default: 'admin' },
    // Store only the latest active token to avoid multiple tokens
    token: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
