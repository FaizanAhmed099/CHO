const Clients = require('../models/Clients');
const fs = require('fs');
const path = require('path');

function formatMongooseError(err) {
  if (err && err.name === 'ValidationError' && err.errors) {
    return Object.values(err.errors).map((e) => e.message || String(e));
  }
  return null;
}

// Create a new client
exports.create = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    // If a file was uploaded by Multer, use it; otherwise allow a direct URL in body.logo
    const uploadedPath = req.file ? `/uploads/clients/${req.file.filename}` : undefined;
    const logo = uploadedPath || req.body.logo;

    const errors = [];
    // name and description are optional now
    if (!logo) errors.push('Logo is required (upload a file or provide a URL)');
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const client = await Clients.create({
      name,
      logo,
      description,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ message: 'Client created', client });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('Clients.create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all clients (active by default). Pass query ?includeInactive=true to include inactive
exports.getAll = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || 'false').toLowerCase() === 'true';
    const filter = includeInactive ? {} : { isActive: { $ne: false } };
    const clients = await Clients.find(filter).sort({ createdAt: -1 });
    return res.json(clients);
  } catch (err) {
    console.error('Clients.getAll error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get single client by id
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Clients.findById(id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    return res.json(client);
  } catch (err) {
    console.error('Clients.getById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update a client
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    // Load existing client first (needed to remove old file if replacing)
    const existing = await Clients.findById(id);
    if (!existing) return res.status(404).json({ message: 'Client not found' });

    const updates = {};
    const allowed = ['name', 'logo', 'description', 'isActive'];
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    // Validate provided fields (partial update)
    const errors = [];
    // name and description can be empty now; no errors
    // If logo is provided as an empty/falsy value and no new file is uploaded, keep existing logo
    if ('logo' in updates && !req.file) {
      if (!updates.logo) {
        delete updates.logo;
      }
    }
    // If a new file is uploaded, override logo with uploaded path
    if (req.file) {
      // Delete previous local file if it looks like a local uploads path
      try {
        const oldLogo = existing.logo;
        if (oldLogo && /^\/uploads\/clients\//.test(oldLogo)) {
          const rel = oldLogo.replace(/^\//, '');
          const abs = path.join(__dirname, '..', rel);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch (_) {
        // ignore file delete errors
      }
      updates.logo = `/uploads/clients/${req.file.filename}`;
    }

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const client = await Clients.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    return res.json({ message: 'Client updated', client });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('Clients.update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Hard delete a client (permanently remove document and its local logo file if present)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Clients.findById(id);
    if (!existing) return res.status(404).json({ message: 'Client not found' });

    // Try to delete local file if stored under uploads/clients
    try {
      const oldLogo = existing.logo;
      if (oldLogo && /^\/uploads\/clients\//.test(oldLogo)) {
        const rel = oldLogo.replace(/^\//, '');
        const abs = path.join(__dirname, '..', rel);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    } catch (_) {}

    await Clients.findByIdAndDelete(id);
    return res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error('Clients.remove error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};