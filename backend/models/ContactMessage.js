const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    // Accept digits, spaces, dashes, parentheses, plus; 7-20 chars after stripping spaces
    telephone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => {
          if (!v) return false;
          const compact = String(v).replace(/\s+/g, '');
          return /^[+\d()\-]{7,20}$/.test(compact);
        },
        message: 'Invalid telephone number',
      },
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Message must be at least 3 characters'],
      maxlength: [2000, 'Message must be at most 2000 characters'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
