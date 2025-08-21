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

// Append uploaded files into a single BulkImages document (bulk source of truth)
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

    const images = files.map((f) => ({ url: `/uploads/gallery/${f.filename}`, isActive: true, createdAt: new Date() }));

    // Append to a deterministic single document, avoid duplicates by url
    // Because $addToSet on objects checks full object equality, we ensure unique by pulling existing urls first
    const existing = await BulkImages.findOne({}, null, { sort: { createdAt: 1 } });
    let toInsert = images;
    if (existing && Array.isArray(existing.images)) {
      const existingUrls = new Set(existing.images.map((it) => it.url));
      toInsert = images.filter((it) => !existingUrls.has(it.url));
    }
    const doc = await BulkImages.findOneAndUpdate(
      {},
      { $push: { images: { $each: toInsert } } },
      { new: true, upsert: true, setDefaultsOnInsert: true, sort: { createdAt: 1 } }
    );

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
    const items = await BulkImages.find({}).sort({ createdAt: 1 });
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
    const { id } = req.params;
    const existing = await BulkImages.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    // Best-effort delete of files stored under /uploads/gallery/
    try {
      for (const p of existing.images || []) {
        if (p && /^\/uploads\/gallery\//.test(p.url)) {
          const rel = p.url.replace(/^\//, '');
          const abs = path.join(__dirname, '..', rel);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      }
    } catch (_) {}

    await BulkImages.findByIdAndDelete(id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('BulkImages.remove error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update isActive for a single image by subdocument id
exports.updateImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { isActive } = req.body;
    const val = String(isActive) === 'false' ? false : Boolean(isActive);
    const updated = await BulkImages.findOneAndUpdate(
      { 'images._id': imageId },
      { $set: { 'images.$.isActive': val } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Updated', item: updated });
  } catch (err) {
    console.error('BulkImages.updateImage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete an image subdocument by id (and remove file if local)
exports.removeImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const doc = await BulkImages.findOne({ 'images._id': imageId });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const img = doc.images.id(imageId);
    if (!img) return res.status(404).json({ message: 'Not found' });

    // Try to delete file from disk if under uploads
    try {
      const oldUrl = img.url;
      if (oldUrl && /^\/uploads\//.test(oldUrl)) {
        const rel = oldUrl.replace(/^\//, '');
        const abs = path.join(__dirname, '..', rel);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    } catch (_) {}

    await BulkImages.updateOne({ _id: doc._id }, { $pull: { images: { _id: imageId } } });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('BulkImages.removeImage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
