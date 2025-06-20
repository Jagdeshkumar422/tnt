// middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_admin_secret'; // Use env var in production

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded.adminId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
