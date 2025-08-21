// backend/models/BulkImages.js
const mongoose = require('mongoose');

const BulkImagesSchema = new mongoose.Schema(
  {
    images: {
      type: [String],
      required: true,
      validate: [(arr) => Array.isArray(arr) && arr.length > 0, 'At least one image is required'],
    },
  },
  { timestamps: true, collection: 'bulk_images' }
);

module.exports = mongoose.model('BulkImages', BulkImagesSchema);
