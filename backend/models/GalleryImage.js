// backend/models/GalleryImage.js
const mongoose = require('mongoose');

const GalleryImageSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    titleAr: { type: String, default: '' },
    image: { type: String, required: true }, // /uploads/gallery/<file>
    alt: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'gallery_images' }
);

module.exports = mongoose.model('GalleryImage', GalleryImageSchema);
