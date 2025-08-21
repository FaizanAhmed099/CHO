// backend/controllers/bulkImagesController.js
const fs = require('fs');
const path = require('path');
const BulkImages = require('../models/BulkImages');

function formatMongooseError(err) {
  if (err && err.name === 'ValidationError' && err.errors) {
    return Object.values(err.errors).map((e) => e.message || String(e));
  }
  return null;
}

// Create a bulk-images document from uploaded files
exports.create = async (req, res) => {
  try {
    // Normalize files from upload.fields: req.files = { images: [...], 'images[]': [...] }
    let files = [];
    if (Array.isArray(req.files)) files = req.files; // just in case
    else if (req.files && typeof req.files === 'object') {
      for (const k of Object.keys(req.files)) {
        if (Array.isArray(req.files[k])) files.push(...req.files[k]);
      }
    }

    if (!files.length) {
      return res.status(400).json({ message: 'Validation failed', errors: ['No images uploaded'] });
    }

    const images = files.map((f) => `/uploads/gallery/${f.filename}`);
    const doc = await BulkImages.create({ images });
    return res.status(201).json({ message: 'Created', item: doc });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('BulkImages.create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// List
exports.getAll = async (_req, res) => {
  try {
    const items = await BulkImages.find({}).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('BulkImages.getAll error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get by id
exports.getById = async (req, res) => {
  try {
    const item = await BulkImages.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('BulkImages.getById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete a document and optionally delete files from disk
exports.remove = async (req, res) => {
  try {
    const item = await BulkImages.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    // Best-effort delete of files stored under /uploads/gallery/
    try {
      for (const p of item.images || []) {
        if (p && /^\/uploads\/gallery\//.test(p)) {
          const rel = p.replace(/^\//, '');
          const abs = path.join(__dirname, '..', rel);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      }
    } catch (_) {}

    await BulkImages.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('BulkImages.remove error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
