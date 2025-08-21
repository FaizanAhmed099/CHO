// server/index.js
// Load environment variables from project root .env BEFORE other imports
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const clientsRoutes = require('./routes/clientsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const awardCertificatesRoutes = require('./routes/awardCertificatesRoutes');
const projectsRoutes = require('./routes/projectsRoutes');
const directorsRoutes = require('./routes/directorsRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const bulkImagesRoutes = require('./routes/bulkImagesRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allows requests from different origins
app.use(express.json()); // Allows us to parse JSON in the request body
// Serve static files for uploaded logos (if you store files locally)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to database
connectDB();

// Basic health check route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/clients', clientsRoutes)
app.use('/api/contact', contactRoutes);
app.use('/api/awards-certificates', awardCertificatesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/directors', directorsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/bulk-images', bulkImagesRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});