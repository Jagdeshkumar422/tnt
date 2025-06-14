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
const cloudinary = require('../config/cloudinary');




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
  function generateUserId() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

let newUserId;
do {
  newUserId = generateUserId();
} while (await User.findOne({ userId: newUserId }));

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
      if (invitation !== 'PixelNFT') {
        return res.status(400).json({ message: 'Invalid invitation code for first user' });
      }
    }

    // Generate unique invitationCode for the new user
   function generateInvitationCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Usage in your async context
let newInvitationCode;
do {
  newInvitationCode = generateInvitationCode();
} while (await User.findOne({ invitationCode: newInvitationCode }));;

    const {
      walletAddressBEP20,
      walletAddressTRC20,
      privateKeyBEP20,
      privateKeyTRC20
    } = generateWallets();

    const user = new User({
      username,
      email,
      userId: newUserId,
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

const streamifier = require("streamifier");

exports.updateProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const imageUrl = req.file.path; // Cloudinary URL provided by multer-storage-cloudinary

    // Update user profile pic URL in DB
    const userId = req.user._id; // or however you get user id
    const user = await User.findByIdAndUpdate(userId, { profilePic: imageUrl }, { new: true });

    res.json({ message: "Profile pic updated", user });
  } catch (error) {
    console.error("Error uploading profile pic:", error);
    res.status(500).json({ message: "Server error" });
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
    // Search by username or email based on `type`
    const query = type === 'username' ? { username: identifier } : { email: identifier };
    const user = await User.findOne(query);

    if (!user) {
      console.log('User not found for', query);
      return res.status(401).json({ message: 'User not found' });
    }

    // Direct password check (no hashing)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', {
      expiresIn: '1d',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
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

    user.password = newPassword;
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
// exports.changePasswordSendCode = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: 'Email is required' });
//     }

//     const generatedCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code
//     verificationCodes[email] = generatedCode;

//     const transporter = nodemailer.createTransport({
//       service: 'Gmail',
//       auth: {
//         user: 'treasusrexnft@gmail.com',
//         pass: 'yucz gkfw cmyv scpm' // Replace with secure app password
//       },
//     });

//     await transporter.sendMail({
//       to: email,
//       subject: 'Password Reset Code',
//       text: `Your password reset code is: ${generatedCode}`,
//     });

//     res.status(200).json({ message: 'Verification code sent' });

//   } catch (error) {
//     console.error('Error sending code:', error);
//     res.status(500).json({ message: 'Failed to send verification code' });
//   }
// };

// // Reset password using verification code
// exports.changePassword = async (req, res) => {
//   try {
//     const { email, code, newPassword } = req.body;

//     if (!email || !code || !newPassword) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     const storedCode = verificationCodes[email];
//     if (!storedCode || Number(code) !== storedCode) {
//       return res.status(400).json({ message: 'Invalid or expired code' });
//     }

  
//     await User.findOneAndUpdate({ email }, { password: newPassword });

//     delete verificationCodes[email];

//     res.status(200).json({ message: 'Password has been reset successfully' });

//   } catch (error) {
//     console.error('Error resetting password:', error);
//     res.status(500).json({ message: 'Failed to reset password' });
//   }
// };

const VerificationCode = require("../models/VerificationCode");

// Send code to email
exports.changePasswordSendCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await VerificationCode.findOneAndUpdate(
      { email },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    let transporter = nodemailer.createTransport({
       host: 'smtp.hostinger.com',
       port: 465, // Use 465 for secure SSL
       secure: true,
       auth: {
         user: 'pixelnft@pixelnft.pro', // Must match 'from' address
      pass: 'PixelNFT@1' // Email password (or app password if required)
       }
     });

    await transporter.sendMail({
      from: '"Pixel Nft" <pixelnft@pixelnft.pro>',
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${code}`,
    });

    res.status(200).json({ message: "Verification code sent" });
  } catch (err) {
    console.error("Error sending code:", err);
    res.status(500).json({ message: "Failed to send verification code" });
  }
};

// Reset password with code
exports.changePassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const record = await VerificationCode.findOne({ email });
    if (!record || record.code !== code || Date.now() > record.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findOneAndUpdate({ email }, { password: newPassword });
    if (!user) return res.status(404).json({ message: "User not found" });

    await VerificationCode.deleteOne({ email });

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

exports.getTodayTeamRevenue = async (req, res) => {
  const userId = req.params.userId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    const user = await User.findById(userId); // populate if referrals are in a separate model

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const todayRevenue = user.teamRevenueHistory
      ?.filter(entry => new Date(entry.createdAt) >= todayStart)
      ?.reduce((sum, entry) => sum + entry.amount, 0) || 0;

    const totalCommunityRewards = user.teamRevenueHistory
      ?.reduce((sum, entry) => sum + entry.amount, 0) || 0;

    const validInvitations = user.referrals?.filter(r => r.isActive)?.length || 0;
    const levelA = user.referrals?.length || 0;
    const levelB = user.referrals
      ?.flatMap(r => r.referrals || [])?.length || 0;
    const levelC = user.referrals
      ?.flatMap(r => r.referrals || [])
      ?.flatMap(r => r.referrals || []).length || 0;

    // 👉 Add level-wise revenue split
    const levelARevenue = user.teamRevenueHistory
      ?.filter(e => e.level === 'A')
      ?.reduce((sum, e) => sum + e.amount, 0) || 0;

    const levelBRevenue = user.teamRevenueHistory
      ?.filter(e => e.level === 'B')
      ?.reduce((sum, e) => sum + e.amount, 0) || 0;

    const levelCRevenue = user.teamRevenueHistory
      ?.filter(e => e.level === 'C')
      ?.reduce((sum, e) => sum + e.amount, 0) || 0;

    res.status(200).json({
      todayTeamRevenue: todayRevenue.toFixed(2),
      totalCommunityRewards: totalCommunityRewards.toFixed(2),
      validInvitations,
      levelA,
      levelBC: levelB + levelC,

      // ✅ New fields:
      levelARevenue: levelARevenue.toFixed(2),
      levelBRevenue: levelBRevenue.toFixed(2),
      levelCRevenue: levelCRevenue.toFixed(2),
    });
  } catch (err) {
    console.error('Error in team revenue stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const moment = require('moment');

exports.getCommunityStats = async (req, res) => {
  const { time } = req.query;

  const timeFilters = {
    Today: { createdAt: { $gte: moment().startOf('day').toDate() } },
    Yesterday: {
      createdAt: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().startOf('day').toDate(),
      },
    },
    'This week': {
      createdAt: { $gte: moment().startOf('week').toDate() },
    },
    'This month': {
      createdAt: { $gte: moment().startOf('month').toDate() },
    },
    All: {}, // No filter
  };

  const filter = timeFilters[time] || {};

  try {
    const allUsers = await User.find(filter);

    const totalRegistered = allUsers.length;
    const activeUsers = allUsers.filter(u => u.balance > 0).length;

    const levels = { A: { registered: 0, active: 0 }, B: { registered: 0, active: 0 }, C: { registered: 0, active: 0 } };

    allUsers.forEach(user => {
      if (user.level === 1) levels.A.registered++;
      if (user.level === 2) levels.B.registered++;
      if (user.level === 3) levels.C.registered++;

      if (user.balance > 0) {
        if (user.level === 1) levels.A.active++;
        if (user.level === 2) levels.B.active++;
        if (user.level === 3) levels.C.active++;
      }
    });

    res.json({
      totalRegistered,
      activeUsers,
      levels
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
};





function getStartOfTimeFilter(time) {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to midnight

  switch (time) {
    case 'Today':
      return now;
    case 'Yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return yesterday;
    case 'This week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Sunday as first day
      return weekStart;
    case 'This month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return null; // 'All' or unknown
  }
}


exports.getTeamRevenue = async (req, res) => {
  const userId = req.user._id; // Get logged-in user's ID from middleware
  const { time = 'All' } = req.query;
  const startDate = getStartOfTimeFilter(time);

  try {
    const pipeline = [
      { $match: { _id: userId } }, // Only get the logged-in user's data
      { $unwind: "$teamRevenueHistory" }
    ];

    if (time === 'Yesterday') {
      const start = getStartOfTimeFilter('Yesterday');
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      pipeline.push({
        $match: {
          "teamRevenueHistory.createdAt": {
            $gte: start,
            $lt: end
          }
        }
      });
    } else if (startDate) {
      pipeline.push({
        $match: {
          "teamRevenueHistory.createdAt": { $gte: startDate }
        }
      });
    }

    pipeline.push({
      $group: {
        _id: "$teamRevenueHistory.level",
        total: { $sum: "$teamRevenueHistory.amount" }
      }
    });

    const results = await User.aggregate(pipeline);

    let A = 0, B = 0, C = 0;
    results.forEach(r => {
      if (r._id === 'A') A = r.total;
      if (r._id === 'B') B = r.total;
      if (r._id === 'C') C = r.total;
    });

    res.json({
      A: A.toFixed(2),
      B: B.toFixed(2),
      C: C.toFixed(2),
      total: (A + B + C).toFixed(2),
    });
  } catch (err) {
    console.error('Error calculating team revenue:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
