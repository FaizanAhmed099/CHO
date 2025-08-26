// backend/controllers/directorsController.js
const fs = require('fs');
const path = require('path');
const Director = require('../models/Director');
const { toArabic } = require('../utils/translate');

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
    const { name, nameAr = '', role, roleAr = '', bio = '', bioAr = '', slug, isActive } = req.body;
    const imagePath = req.file ? `/uploads/directors/${req.file.filename}` : req.body.image;

    const errors = [];
    if (!name || String(name).trim().length < 2) errors.push('Name must be at least 2 characters');
    if (!role) errors.push('Role is required');
    if (!imagePath) errors.push('Image is required');

    const finalSlug = slug ? slugify(slug) : slugify(name);
    if (!finalSlug) errors.push('Slug could not be generated');

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const exists = await Director.findOne({ slug: finalSlug });
    if (exists) return res.status(400).json({ message: 'Validation failed', errors: ['Slug already exists'] });

    // Uniqueness: Only one CEO and one Chairman (Chairman does not include Vice Chairman)
    const roleLc = String(role).toLowerCase();
    const isCeo = roleLc.includes('chief executive') || roleLc.includes('ceo');
    const isChairman = roleLc.includes('chairman') && !roleLc.includes('vice');
    if (isCeo) {
      const existingCeo = await Director.findOne({ role: { $regex: /(chief\s+executive|\bceo\b)/i } });
      if (existingCeo) {
        return res.status(400).json({ message: 'Validation failed', errors: ['A CEO already exists'] });
      }
    }
    if (isChairman) {
      const existingChairman = await Director.findOne({ $and: [
        { role: { $regex: /chairman/i } },
        { role: { $not: /vice/i } }
      ]});
      if (existingChairman) {
        return res.status(400).json({ message: 'Validation failed', errors: ['A Chairman already exists'] });
      }
    }

    // Auto-translate Arabic fields if not provided
    const autoNameAr = nameAr && String(nameAr).trim() ? String(nameAr) : await toArabic(name);
    const autoRoleAr = roleAr && String(roleAr).trim() ? String(roleAr) : await toArabic(role);
    const autoBioAr = bioAr && String(bioAr).trim() ? String(bioAr) : await toArabic(bio);

    const doc = await Director.create({
      name: String(name).trim(),
      nameAr: String(autoNameAr || ''),
      role: String(role).trim(),
      roleAr: String(autoRoleAr || ''),
      bio: String(bio || ''),
      bioAr: String(autoBioAr || ''),
      image: imagePath,
      slug: finalSlug,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ message: 'Created', item: doc });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('Directors.create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public list
exports.getAll = async (req, res) => {
  try {
    const { q } = req.query;
    const includeInactive = String(req.query.includeInactive || 'false').toLowerCase() === 'true';
    const filter = {};
    if (!includeInactive) filter.isActive = { $ne: false };
    if (q) filter.name = { $regex: String(q), $options: 'i' };

    const items = await Director.find(filter).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('Directors.getAll error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public by slug
exports.getBySlug = async (req, res) => {
  try {
    const item = await Director.findOne({ slug: req.params.slug });
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('Directors.getBySlug error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public by id
exports.getById = async (req, res) => {
  try {
    const item = await Director.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('Directors.getById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update (admin)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Director.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const updates = {};
    const allowed = ['name', 'nameAr', 'role', 'roleAr', 'bio', 'bioAr', 'slug', 'isActive', 'image'];
    for (const key of allowed) if (key in req.body) updates[key] = req.body[key];

    const errors = [];
    if ('name' in updates) {
      const n = String(updates.name || '').trim();
      if (n.length < 2) errors.push('Name must be at least 2 characters');
      else updates.name = n;
    }
    if ('slug' in updates || 'name' in updates) {
      const desired = updates.slug ? slugify(updates.slug) : slugify(updates.name || existing.name);
      if (!desired) errors.push('Slug could not be generated');
      else updates.slug = desired;
    }

    // Replace image if new file uploaded
    if (req.file) {
      try {
        const oldImage = existing.image;
        if (oldImage && /^\/uploads\/directors\//.test(oldImage)) {
          const rel = oldImage.replace(/^\//, '');
          const abs = path.join(__dirname, '..', rel);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch (_) {}
      updates.image = `/uploads/directors/${req.file.filename}`;
    } else if ('image' in updates && !updates.image) {
      delete updates.image;
    }

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    // Auto-translate Arabic fields if corresponding English provided and Arabic missing
    if ('name' in updates && (!('nameAr' in updates) || !updates.nameAr)) {
      updates.nameAr = await toArabic(updates.name || existing.name);
    }
    if ('role' in updates && (!('roleAr' in updates) || !updates.roleAr)) {
      updates.roleAr = await toArabic(updates.role || existing.role);
    }
    if ('bio' in updates && (!('bioAr' in updates) || !updates.bioAr)) {
      updates.bioAr = await toArabic(updates.bio || existing.bio);
    }

    // ensure slug uniqueness
    if (updates.slug && updates.slug !== existing.slug) {
      const taken = await Director.findOne({ slug: updates.slug, _id: { $ne: id } });
      if (taken) return res.status(400).json({ message: 'Validation failed', errors: ['Slug already exists'] });
    }

    // Uniqueness on roles: only one CEO and one Chairman (Chairman not including Vice Chairman)
    if ('role' in updates) {
      const r = String(updates.role || '').toLowerCase();
      const wantCeo = r.includes('chief executive') || r.includes('ceo');
      const wantChairman = r.includes('chairman') && !r.includes('vice');
      if (wantCeo) {
        const otherCeo = await Director.findOne({ _id: { $ne: id }, role: { $regex: /(chief\s+executive|\bceo\b)/i } });
        if (otherCeo) return res.status(400).json({ message: 'Validation failed', errors: ['A CEO already exists'] });
      }
      if (wantChairman) {
        const otherChairman = await Director.findOne({ _id: { $ne: id }, $and: [
          { role: { $regex: /chairman/i } },
          { role: { $not: /vice/i } }
        ]});
        if (otherChairman) return res.status(400).json({ message: 'Validation failed', errors: ['A Chairman already exists'] });
      }
    }

    const updated = await Director.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Updated', item: updated });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('Directors.update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete (admin)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Director.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    try {
      const oldImage = existing.image;
      if (oldImage && /^\/uploads\/directors\//.test(oldImage)) {
        const rel = oldImage.replace(/^\//, '');
        const abs = path.join(__dirname, '..', rel);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    } catch (_) {}

    await Director.findByIdAndDelete(id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Directors.remove error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
