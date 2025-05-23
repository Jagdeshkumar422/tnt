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
const nodemailer = require("nodemailer")
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
      inviterUser = await User.findOne({ invitationCode: invitation });
      if (!inviterUser) {
        return res.status(400).json({ message: 'Invalid invitation code' });
      }
    } else {
      if (invitation !== 'TREASURENFTX') {
        return res.status(400).json({ message: 'Invalid invitation code for first user' });
      }
    }

    // Generate unique invitationCode for the new user
    let newInvitationCode;
    do {
      newInvitationCode = crypto.randomBytes(4).toString('hex');
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
      invitation,
      invitationCode: newInvitationCode,
      walletAddressBEP20,
      walletAddressTRC20,
      privateKey: `${privateKeyBEP20}||${privateKeyTRC20}`,
      address: ""
    });

    // Setup referral chain if not first user
    if (inviterUser) {
      user.referredBy = inviterUser._id;

      // Save user first to generate _id for referrals
      await user.save();

      // Team A: inviter adds this user
      inviterUser.teamA.push(user._id);
      await inviterUser.save();

      // Team B: inviter's inviter adds this user
      const level2 = await User.findById(inviterUser.referredBy);
      if (level2) {
        level2.teamB.push(user._id);
        await level2.save();

        // Team C: inviter's inviter's inviter adds this user
        const level3 = await User.findById(level2.referredBy);
        if (level3) {
          level3.teamC.push(user._id);
          await level3.save();
        }
      }
    } else {
      // First user, save after wallet generation
      await user.save();
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
};



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

exports.updateUser = async (req, res) => {
  try {
    const {
      phone,
      countryCode,
      email,
      nationality,
      gender,
      birthday,
      countryFlag
    } = req.body;

    // Assume user is identified by email (or token in real case)
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    user.phone = phone || user.phone;
    user.countryCode = countryCode || user.countryCode;
    user.nationality = nationality || user.nationality;
    user.gender = gender || user.gender;
    user.birthday = birthday || user.birthday;

    await user.save();

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
}


const verificationCodes = {}; // In-memory temporary store

// Send verification code to email
exports.changePasswordSendCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const generatedCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code
    verificationCodes[email] = generatedCode;

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'treasusrexnft@gmail.com',
        pass: 'yucz gkfw cmyv scpm' // Replace with secure app password
      },
    });

    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${generatedCode}`,
    });

    res.status(200).json({ message: 'Verification code sent' });

  } catch (error) {
    console.error('Error sending code:', error);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

// Reset password using verification code
exports.changePassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const storedCode = verificationCodes[email];
    if (!storedCode || Number(code) !== storedCode) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    delete verificationCodes[email];

    res.status(200).json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};