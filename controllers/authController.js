const User = require('../models/User');
const { sendOTP } = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let otpStore = {}; // temp memory storage for OTP

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);
  otpStore[email] = otp;
  await sendOTP(email, otp);
  res.json({ message: 'OTP sent' });
};

exports.register = async (req, res) => {
  const { username, email, password, phone, code, countryCode } = req.body;
  if (otpStore[email] != code) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  const user = new User({ username, email, password, phone, countryCode });
  await user.save();
  delete otpStore[email];
  res.json({ message: 'User registered' });
};

exports.getCountries = (req, res) => {
  const countries = require('../data/countryCodes.json');
  res.json(countries);
};



exports.login = async (req, res) => {
  const { identifier, password, type } = req.body; // type = 'username' or 'email'

  if (!identifier || !password || !type) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Search user by username or email
    const query = type === 'username' ? { username: identifier } : { email: identifier };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', {
      expiresIn: '1d',
    });

    res.status(200).json({ message: 'Login successful', token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// ==========================
// 🔐 Reset Password Feature
// ==========================

exports.sendResetOtp = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not registered' });
  
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;
  
    await sendOTP(email, otp);
    res.json({ message: 'Reset OTP sent to email' });
  };
  
  exports.resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;
  
    if (otpStore[email] != code) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
  
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
  
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newPassword;
    await user.save();
  
    delete otpStore[email];
  
    res.json({ message: 'Password reset successfully' });
  };
  