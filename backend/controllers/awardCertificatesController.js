// backend/controllers/awardCertificatesController.js
const fs = require('fs');
const path = require('path');
const AwardCertificate = require('../models/AwardCertificate');

function formatMongooseError(err) {
  if (err && err.name === 'ValidationError' && err.errors) {
    return Object.values(err.errors).map((e) => e.message || String(e));
  }
  return null;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function resolveMonth(inputName, inputNumber) {
  if (typeof inputName === 'string' && inputName.trim()) {
    const idx = MONTHS.findIndex((m) => m.toLowerCase() === inputName.trim().toLowerCase());
    if (idx !== -1) return { name: MONTHS[idx] };
  }
  const n = Number(inputNumber);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) {
    return { name: MONTHS[n - 1] };
  }
  return null;
}

// Create a new award/certificate (admin)
exports.create = async (req, res) => {
  try {
    const { title, year, month, monthName, isActive } = req.body;
    const uploadedPath = req.file ? `/uploads/awards-certificates/${req.file.filename}` : undefined;
    const image = uploadedPath || req.body.image;

    const errors = [];
    if (!title || String(title).trim().length < 3) errors.push('Title is required and must be at least 3 characters');
    const y = Number(year);
    if (!y || y < 1900 || y > 3000) errors.push('Year must be a number between 1900 and 3000');
    const resolved = resolveMonth(monthName, month);
    if (!resolved) errors.push('Provide a valid month name (e.g., "June") or number (1-12)');
    if (!image) errors.push('Image is required (upload a file or provide a URL)');

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const doc = await AwardCertificate.create({
      title: String(title).trim(),
      image,
      year: y,
      monthName: resolved.name,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ message: 'Created', item: doc });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('AwardCertificates.create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public: list (active by default)
exports.getAll = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || 'false').toLowerCase() === 'true';
    const filter = includeInactive ? {} : { isActive: { $ne: false } };
    const items = await AwardCertificate.find(filter).sort({ year: -1, createdAt: -1 });
    const monthOrder = new Map(MONTHS.map((m, i) => [m, i + 1]));
    items.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const ai = monthOrder.get(a.monthName) || 0;
      const bi = monthOrder.get(b.monthName) || 0;
      if (ai !== bi) return bi - ai;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return res.json(items);
  } catch (err) {
    console.error('AwardCertificates.getAll error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Public: get by id
exports.getById = async (req, res) => {
  try {
    const item = await AwardCertificate.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('AwardCertificates.getById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update (admin)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await AwardCertificate.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const updates = {};
    const allowed = ['title', 'image', 'year', 'month', 'monthName', 'isActive'];
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const errors = [];
    if ('title' in updates) {
      const t = String(updates.title || '').trim();
      if (t.length < 3) errors.push('Title must be at least 3 characters');
      else updates.title = t;
    }
    if ('year' in updates) {
      const y = Number(updates.year);
      if (!y || y < 1900 || y > 3000) errors.push('Year must be a number between 1900 and 3000');
      else updates.year = y;
    }
    if ('month' in updates || 'monthName' in updates) {
      const resolved = resolveMonth(updates.monthName, updates.month);
      if (!resolved) errors.push('Provide a valid month name (e.g., "June") or number (1-12)');
      else {
        updates.monthName = resolved.name;
        delete updates.month;
      }
    }

    // Replace image if new file uploaded
    if (req.file) {
      try {
        const oldImage = existing.image;
        if (oldImage && /^\/uploads\/awards-certificates\//.test(oldImage)) {
          const rel = oldImage.replace(/^\//, '');
          const abs = path.join(__dirname, '..', rel);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch (_) {}
      updates.image = `/uploads/awards-certificates/${req.file.filename}`;
    } else if ('image' in updates && !updates.image) {
      delete updates.image;
    }

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const updated = await AwardCertificate.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Updated', item: updated });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('AwardCertificates.update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete (admin)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await AwardCertificate.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    try {
      const oldImage = existing.image;
      if (oldImage && /^\/uploads\/awards-certificates\//.test(oldImage)) {
        const rel = oldImage.replace(/^\//, '');
        const abs = path.join(__dirname, '..', rel);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    } catch (_) {}

    await AwardCertificate.findByIdAndDelete(id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('AwardCertificates.remove error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
