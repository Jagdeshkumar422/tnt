const User = require('../models/User');
const { sendOTP } = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Transaction = require("../models/Transaction");
const { Wallet } = require('ethers');
const mongoose = require('mongoose');
require('dotenv').config();
const {generateWallets} = require("../utils/generateWallet")
const crypto = require('crypto');

const TronWeb = require('tronweb').default.TronWeb;
const tronWeb = new TronWeb({ fullHost: 'https://api.shasta.trongrid.io' });




const INITIAL_INVITE_CODE = 'TreasurNFTX';

// ====================
// 🔐 OTP & Registration
// ====================

const otpStore = {}; // In-memory store (move to Redis or DB for production)

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 90000; // 90 seconds in milliseconds

  otpStore[email] = { otp, expiresAt };
  await sendOTP(email, otp);
  res.json({ message: 'OTP sent' });
};


exports.register = async (req, res) => {
  const { username, email, password, phone, code, countryCode, invitation } = req.body;

  const otpEntry = otpStore[email];

  if (!invitation) {
    return res.status(400).json({ message: 'Invitation code is required.' });
  }

  if (
    !otpEntry ||
    otpEntry.otp !== parseInt(code) ||
    Date.now() > otpEntry.expiresAt
  ) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const totalUsers = await User.countDocuments();

    let inviterUser = null;
    if (totalUsers > 0) {
      // Find inviter by invitationCode
      inviterUser = await User.findOne({ invitationCode: invitation });
      if (!inviterUser) {
        return res.status(400).json({ message: 'Invalid invitation code' });
      }
    } else {
      // First user (no inviter) - you can set a default admin invitation code or skip check
      // For example:
      if (invitation !== 'TREASURENFTX') {
        return res.status(400).json({ message: 'Invalid invitation code for first user' });
      }
    }

    // Generate unique invitationCode for the new user
    let newInvitationCode;
    do {
      newInvitationCode = crypto.randomBytes(4).toString('hex'); // 8 char hex code
    } while (await User.findOne({ invitationCode: newInvitationCode }));

    const {
      walletAddressBEP20,
      walletAddressTRC20,
      privateKeyBEP20,
      privateKeyTRC20
    } = generateWallets();

    const user = new User({
      username,
      email,
      password,
      phone,
      countryCode,
      invitation,       // inviter's invitationCode
      invitationCode: newInvitationCode,  // unique code for this user
      walletAddressBEP20,
      walletAddressTRC20,
      privateKey: `${privateKeyBEP20}||${privateKeyTRC20}`
    });

    await user.save();

    // Update inviter's invitedUsers list
    if (inviterUser) {
      inviterUser.invitedUsers = inviterUser.invitedUsers || [];
      inviterUser.invitedUsers.push(user._id);
      await inviterUser.save();
    }

    delete otpStore[email];

    res.status(201).json({
      message: 'User registered successfully',
      walletAddressBEP20,
      walletAddressTRC20,
      invitationCode: newInvitationCode,
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
}



exports.getCountries = (req, res) => {
  const countries = require('../data/countryCodes.json');
  res.json(countries);
};

// ====================
// 🔐 Login
// ====================

exports.login = async (req, res) => {
  const { identifier, password, type } = req.body;

  if (!identifier || !password || !type) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const query = type === 'username' ? { username: identifier } : { email: identifier };
    const user = await User.findOne(query);

    if (!user) {
      console.log('User not found for', query);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('User found:', user.username);
    console.log('Password from DB:', user.password);
    console.log('Password input:', password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);

    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', {
      expiresIn: '1d',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ====================
// 📲 Wallet & Balance
// ====================

exports.getwallet = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ address: user.walletAddress });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getBalance = async (req, res) => {
  const userId = req.params.userId;

  try {
    const deposits = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } }
    ]);

    const balance = deposits.length > 0 ? deposits[0].total : 0;
    res.json({ balance });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching balance', error: err.message });
  }
};


exports.depositeHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const deposits = await Transaction.find({ user: userId }).sort({ timestamp: -1 });
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching history', error: err.message });
  }
};

// ====================
// 🔐 Reset Password
// ====================

exports.sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not registered' });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    await sendOTP(email, otp);
    res.json({ message: 'Reset OTP sent to email' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending OTP', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (otpStore[email] !== parseInt(code)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    delete otpStore[email];
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password', error: err.message });
  }
};

// ====================
// 👤 User Info
// ====================

exports.getUsers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
