// server/index.js
// Load environment variables from project root .env BEFORE other imports
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { toArabic } = require("./utils/translate");

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
app.use(express.json({ limit: "10mb" }));// Allows us to parse JSON in the request body
app.use(express.urlencoded({ limit: "10mb", extended: true }));
// Serve static files for uploaded logos (if you store files locally)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to database
connectDB();

// // Basic health check route
// app.get('/', (req, res) => {
//   res.send('API is running');
// });

app.post('/api/translate', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text to translate is required' });
  }
  try {
    const translatedText = await toArabic(text);
    res.json({ translatedText });
  } catch (error) {
    console.error('Translation endpoint error:', error.message);
    // Graceful fallback: return 200 with error flag to avoid breaking UI
    res.json({ translatedText: '', error: true, message: 'Auto-translation service failed. Please enter manually.' });
  }
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