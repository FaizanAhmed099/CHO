// backend/models/Project.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3 },
    category: { type: String, required: true, trim: true }, // e.g., Engineering and Construction Management
    status: { type: String, required: true, trim: true, default: 'Ongoing Projects' },
    image: { type: String, required: true }, // URL or /uploads/projects/<file>
    description: { type: String, default: '' },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'projects' }
);

module.exports = mongoose.model('Project', ProjectSchema);
