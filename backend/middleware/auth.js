// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async function (req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = parts[1];
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server misconfigured: JWT_SECRET missing' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Ensure token matches the latest stored token for this admin
    const admin = await Admin.findById(decoded.id).select('token');
    if (!admin || !admin.token || admin.token !== token) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
