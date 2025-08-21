// backend/models/BulkImages.js
const mongoose = require('mongoose');

const ImageItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const BulkImagesSchema = new mongoose.Schema(
  {
    images: {
      type: [ImageItemSchema],
      required: true,
      validate: [
        (arr) => Array.isArray(arr) && arr.length > 0,
        'At least one image is required',
      ],
    },
  },
  { timestamps: true, collection: 'bulk_images' }
);

module.exports = mongoose.model('BulkImages', BulkImagesSchema);
