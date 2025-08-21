const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Public URL or relative path to the stored logo image
    logo: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Clients', ClientSchema);