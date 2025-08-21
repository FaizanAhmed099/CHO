// backend/controllers/projectsController.js
const fs = require('fs');
const path = require('path');
const Project = require('../models/Project');

function formatMongooseError(err) {
  if (err && err.name === 'ValidationError' && err.errors) {
    return Object.values(err.errors).map((e) => e.message || String(e));
  }
  return null;
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Create (admin)
exports.create = async (req, res) => {
  try {
    const { title, category, status, description = '', slug, isActive } = req.body;
    const imagePath = req.file ? `/uploads/projects/${req.file.filename}` : req.body.image;

    const errors = [];
    if (!title || String(title).trim().length < 3) errors.push('Title must be at least 3 characters');
    if (!category) errors.push('Category is required');
    if (!status) errors.push('Status is required');
    if (!imagePath) errors.push('Image is required');

    const finalSlug = slug ? slugify(slug) : slugify(title);
    if (!finalSlug) errors.push('Slug could not be generated');

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const exists = await Project.findOne({ slug: finalSlug });
    if (exists) return res.status(400).json({ message: 'Validation failed', errors: ['Slug already exists'] });

    const doc = await Project.create({
      title: String(title).trim(),
      category: String(category).trim(),
      status: String(status).trim(),
      image: imagePath,
      description: String(description || ''),
      slug: finalSlug,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ message: 'Created', item: doc });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('Projects.create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public list
exports.getAll = async (req, res) => {
  try {
    const { category, status, q } = req.query;
    const includeInactive = String(req.query.includeInactive || 'false').toLowerCase() === 'true';
    const filter = {};
    if (!includeInactive) filter.isActive = { $ne: false };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (q) filter.title = { $regex: String(q), $options: 'i' };

    const items = await Project.find(filter).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('Projects.getAll error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public by slug
exports.getBySlug = async (req, res) => {
  try {
    const item = await Project.findOne({ slug: req.params.slug });
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('Projects.getBySlug error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public by id
exports.getById = async (req, res) => {
  try {
    const item = await Project.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('Projects.getById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update (admin)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Project.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const updates = {};
    const allowed = ['title', 'category', 'status', 'description', 'slug', 'isActive', 'image'];
    for (const key of allowed) if (key in req.body) updates[key] = req.body[key];

    const errors = [];
    if ('title' in updates) {
      const t = String(updates.title || '').trim();
      if (t.length < 3) errors.push('Title must be at least 3 characters');
      else updates.title = t;
    }
    if ('slug' in updates || 'title' in updates) {
      const desired = updates.slug ? slugify(updates.slug) : slugify(updates.title || existing.title);
      if (!desired) errors.push('Slug could not be generated');
      else updates.slug = desired;
    }
    // no 'order' field anymore

    // Replace image if new file uploaded
    if (req.file) {
      try {
        const oldImage = existing.image;
        if (oldImage && /^\/uploads\/projects\//.test(oldImage)) {
          const rel = oldImage.replace(/^\//, '');
          const abs = path.join(__dirname, '..', rel);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch (_) {}
      updates.image = `/uploads/projects/${req.file.filename}`;
    } else if ('image' in updates && !updates.image) {
      delete updates.image;
    }

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    // ensure slug uniqueness
    if (updates.slug && updates.slug !== existing.slug) {
      const taken = await Project.findOne({ slug: updates.slug, _id: { $ne: id } });
      if (taken) return res.status(400).json({ message: 'Validation failed', errors: ['Slug already exists'] });
    }

    const updated = await Project.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Updated', item: updated });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('Projects.update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete (admin)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Project.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    try {
      const oldImage = existing.image;
      if (oldImage && /^\/uploads\/projects\//.test(oldImage)) {
        const rel = oldImage.replace(/^\//, '');
        const abs = path.join(__dirname, '..', rel);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    } catch (_) {}

    await Project.findByIdAndDelete(id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Projects.remove error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
