const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ msg: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(404).json({ msg: "User not found" });

    next();
  } catch (error) {
    res.status(401).json({ msg: "Token invalid" });
  }
};
