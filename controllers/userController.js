const User = require("../models/User")
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");


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
      subject: 'Email Verification Code from Treasure',
      html: htmlTemplate,
    });

    res.status(200).json({ message: "Code sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
};



exports.register = async (req, res) => {
  const { phone, countryCode, email, code, loginPassword, transactionPassword, referralCode } = req.body;

  const saved = codes[email];

  if (!saved || saved.code !== parseInt(code)) {
    return res.status(400).json({ message: "Invalid verification code." });
  }

  if (Date.now() > saved.expiresAt) {
    delete codes[email];
    return res.status(400).json({ message: "Verification code expired. Please request a new one." });
  }

  try {
    const newUser = new User({
      phone,
      countryCode,
      email,
      loginPassword,
      transactionPassword,
      referralCode,
    });

    await newUser.save();
    delete codes[email];
    res.json({ message: "User registered successfully." });
  } catch (err) {
    console.error(err);
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
      { expiresIn: "2h" }
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

  const savedCode = codes[email];

  if (!savedCode || savedCode.code !== parseInt(code)) {
    return res.status(400).json({ message: "Invalid verification code." });
  }

  if (Date.now() > savedCode.expiresAt) {
    delete codes[email];
    return res.status(400).json({ message: "Verification code expired." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found." });

    user.loginPassword = newPassword;
    await user.save();

    delete codes[email];

    return res.status(200).json({ message: "Login password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Server error while updating password." });
  }
};