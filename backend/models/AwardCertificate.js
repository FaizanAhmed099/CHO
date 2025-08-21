// backend/models/AwardCertificate.js
const mongoose = require('mongoose');

const AwardCertificateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3 },
    image: { type: String, required: true }, // URL or /uploads/awards/<file>
    year: { type: Number, required: true, min: 1900, max: 3000 },
    monthName: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'awards_certificates' }
);

module.exports = mongoose.model('AwardCertificate', AwardCertificateSchema);
