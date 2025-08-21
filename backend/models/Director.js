// backend/models/Director.js
const mongoose = require('mongoose');

const DirectorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    nameAr: { type: String, default: '' },
    role: { type: String, required: true, trim: true },
    roleAr: { type: String, default: '' },
    bio: { type: String, default: '' },
    bioAr: { type: String, default: '' },
    image: { type: String, required: true }, // URL or /uploads/directors/<file>
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'directors' }
);

module.exports = mongoose.model('Director', DirectorSchema);
