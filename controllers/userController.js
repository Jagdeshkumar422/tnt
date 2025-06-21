const User = require("../models/User")
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { generateWalletForUser } = require('../utils/walletGenerator');

let codes = {}; 
exports.sendEmail = async (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000);

  // Save code + expiry (15 minutes)
  codes[email] = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins in ms
  };

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'contact@mmt3x.xyz',
      pass: 'Mmt3x@15432',
    },
  });

  const htmlTemplate = `
    <p>Greetings,</p>
    <p>Below is your email verification code from Mmt3x.</p>
    <p>To complete this email verification, please enter the code and proceed to the next step:</p>
    <h2>${code}</h2>
    <p>(This code will be valid for 15 minutes after request and available to resend if it expires.)</p>
    <p>Thank you!<br/>
    <small>**This notice is automatically sent by system. Please do not reply to this address.</small></p>
    <p>If you have any questions, please contact us from the app for further information.</p>
  `;

  try {
    await transporter.sendMail({
      from: '"Mmt3x" <contact@mmt3x.xyz>',
      to: email,
      subject: 'Email Verification Code from Mmt3x',
      html: htmlTemplate,
    });

    res.status(200).json({ message: "Code sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
};






const DEFAULT_REFERRAL_CODE = "Mmt3x";
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/auth");

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.register = async (req, res) => {
  const {
    phone,
    countryCode,
    email,
    code,
    loginPassword,
    transactionPassword,
    referralCode,
  } = req.body;

  try {
    // Step 1: Basic validations
    if (!referralCode) {
      return res.status(400).json({ message: "Referral code is required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const saved = codes[email];
    if (!saved || saved.code !== parseInt(code)) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    if (Date.now() > saved.expiresAt) {
      delete codes[email];
      return res.status(400).json({ message: "Verification code expired." });
    }

    // Step 2: Set up referrer/uplines
    let referrerA = null;
    let uplineB = null;
    let uplineC = null;

    if (referralCode === DEFAULT_REFERRAL_CODE) {
      const existingAdminReferrer = await User.findOne({ referralCode: DEFAULT_REFERRAL_CODE });
      if (!existingAdminReferrer) {
        // Allow first user to register using default code
        referrerA = null;
      } else {
        referrerA = existingAdminReferrer;
        uplineB = referrerA.uplineA || null;
        uplineC = referrerA.uplineB || null;
      }
    } else {
      referrerA = await User.findOne({ referralCode });
      if (!referrerA) {
        return res.status(400).json({ message: "Invalid referral code." });
      }
      uplineB = referrerA.uplineA || null;
      uplineC = referrerA.uplineB || null;
    }

    // Step 3: Create user
    const newUser = new User({
      phone,
      countryCode,
      email,
      loginPassword,
      transactionPassword,
      userId: Math.floor(100000 + Math.random() * 900000).toString(),
      referralCode: generateReferralCode(),

      referredBy: referrerA?._id || null,
      uplineA: referrerA?._id || null,
      uplineB,
      uplineC,
    });

    await newUser.save();

    // Step 4: Update referrer’s referrals
    if (referrerA) {
      referrerA.referrals.push(newUser._id);
      await referrerA.save();
    }

    // Step 5: Generate wallets
    await generateWalletForUser(newUser._id);

    // Step 6: Clear OTP and respond
    delete codes[email];
    res.json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Registration failed." });
  }
};




exports.login = async (req, res) => {
  const { email, loginPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.loginPassword !== loginPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
};


let resetCodes = {}; // { email: { code, expiresAt } }

// Send Reset Code
exports.sendResetCode = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const code = Math.floor(100000 + Math.random() * 900000);
  resetCodes[email] = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };

  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: "contact@mmt3x.xyz",
      pass: "Mmt3x@15432",
    },
  });

  const htmlTemplate = `
    <p>Hello,</p>
    <p>Use the following code to reset your password:</p>
    <h2>${code}</h2>
    <p>This code will expire in 15 minutes.</p>
  `;

  try {
    await transporter.sendMail({
      from: '"Mmt3x" <contact@mmt3x.xyz>',
      to: email,
      subject: "Password Reset Code",
      html: htmlTemplate,
    });

    return res.json({ message: "Reset code sent successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to send email" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const saved = resetCodes[email];
  if (!saved || saved.code !== parseInt(code)) {
    return res.status(400).json({ message: "Invalid or expired code" });
  }

  if (Date.now() > saved.expiresAt) {
    delete resetCodes[email];
    return res.status(400).json({ message: "Verification code expired" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.loginPassword = newPassword;
    await user.save();

    delete resetCodes[email];
    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset error:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};



exports.changeLoginPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const savedCode = resetCodes[email];

  if (!savedCode || savedCode.code !== parseInt(code)) {
    return res.status(400).json({ message: "Invalid verification code." });
  }

  if (Date.now() > savedCode.expiresAt) {
    delete resetCodes[email];
    return res.status(400).json({ message: "Verification code expired." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found." });

    user.loginPassword = newPassword;
    await user.save();

    delete resetCodes[email];

    return res.status(200).json({ message: "Login password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Server error while updating password." });
  }
};



exports.updateUser = async (req, res) => {
  const userId = req.user.id;
  const { name, email, telegram, whatsapp, code } = req.body;

  try {
    // Step 1: Verify code
    const record = codes[email];
    if (!record || record.code != code || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // Step 2: Update user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.email = email || user.email;
    user.telegram = telegram || user.telegram;
    user.whatsapp = whatsapp || user.whatsapp;

    await user.save();

    // Step 3: Cleanup
    delete codes[email];

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }

};

const verificationCodes = {};

exports.sendWithdrawalCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save code temporarily (in-memory)
    verificationCodes[email] = {
      code,
      expiry: Date.now() + 90 * 1000, // 90 seconds
    };

    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'contact@mmt3x.xyz',
        pass: 'Mmt3x@15432',
      },
    });

    await transporter.sendMail({
      from: '"Mmt3x" <contact@mmt3x.xyz>',
      to: email,
      subject: "Withdrawal Password Reset Code",
      text: `Your verification code is: ${code}`,
    });

    return res.json({ message: "Verification code sent to email." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.changeWithdrawalPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const entry = verificationCodes[email];

    if (
      !entry ||
      entry.code !== code ||
      Date.now() > entry.expiry
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // Clear code after use
    delete verificationCodes[email];

    // Hash and update withdrawal password
  
    user.withdrawalPassword = newPassword;
    await user.save();

    return res.json({ message: "Withdrawal password updated successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.getUsers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only return necessary user info
    res.json({user});
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle user block/unblock
exports.toggleBlockUser = async (req, res) => {
  const { userId} = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isBlocking = !user.isBlocked;

    user.isBlocked = isBlocking;
    user.blockedAt = isBlocking ? new Date() : null;

    await user.save();

    res.json({
      message: isBlocking ? "User blocked successfully" : "User unblocked successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const imageUrl = req.file.path; // Cloudinary URL provided by multer-storage-cloudinary
    console.log(imageUrl)

    // Update user profile pic URL in DB
    const userId = req.user._id; // or however you get user id
    console.log(userId)
    const user = await User.findByIdAndUpdate(userId, { profilePic: imageUrl }, { new: true });

    res.json({ message: "Profile pic updated", user });
  } catch (error) {
    console.error("Error uploading profile pic:", error);
    res.status(500).json({ message: "Server error" });
  }
};