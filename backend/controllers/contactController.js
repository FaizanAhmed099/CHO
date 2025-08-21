const ContactMessage = require('../models/ContactMessage');

function formatMongooseError(err) {
  if (err && err.name === 'ValidationError' && err.errors) {
    return Object.values(err.errors).map((e) => e.message || String(e));
  }
  return null;
}

// Create a new contact message (public)
exports.create = async (req, res) => {
  try {
    const { firstName, lastName, email, telephone, message } = req.body;

    const errors = [];
    if (!firstName) errors.push('First Name is required');
    if (!lastName) errors.push('Last Name is required');
    if (!email) errors.push('Email ID is required');
    if (!telephone) errors.push('Telephone is required');
    if (!message) errors.push('Message is required');

    // Case-specific messages
    if (typeof message === 'string' && message.trim().length > 0 && message.trim().length < 3) {
      errors.push('Case 1: Short message (invalid ❌ because < 3 chars)');
    }
    if (email && !/^\S+@\S+\.\S+$/.test(String(email))) {
      errors.push('Case 2: Invalid email (invalid ❌)');
    }
    if (telephone) {
      const compact = String(telephone).replace(/\s+/g, '');
      if (!/^[+\d()\-]{7,20}$/.test(compact)) {
        errors.push('Case 3: Invalid telephone (invalid ❌)');
      }
    }

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const doc = await ContactMessage.create({ firstName, lastName, email, telephone, message });

    return res.status(201).json({ message: 'Message received', data: doc });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted) return res.status(400).json({ message: 'Validation failed', errors: formatted });
    console.error('Contact.create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// List messages (admin protected)
exports.list = async (req, res) => {
  try {
    const items = await ContactMessage.find({}).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('Contact.list error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get single message (admin protected)
exports.getById = async (req, res) => {
  try {
    const item = await ContactMessage.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('Contact.getById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete message (admin protected)
exports.remove = async (req, res) => {
  try {
    const removed = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Contact.remove error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
