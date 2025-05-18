const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");
const nodemailer = require("nodemailer");
// const authMiddleware = require("../middleware/authMiddleware");

// Email setup (adjust accordingly)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'treasusrexnft@gmail.com',
      pass: 'yucz gkfw cmyv scpm' 
  },
});

exports.getgoogleSecretkey = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // ✅ Check if secret is already generated
    if (user.google2faSecret) {
      const otpauthUrl = speakeasy.otpauthURL({
        secret: user.google2faSecret,
        label: `YourAppName (${user.email})`,
        encoding: 'base32'
      });

      const qrCode = await qrcode.toDataURL(otpauthUrl);

      return res.json({
        qrCode,
        secret: user.google2faSecret
      });
    }

    // ✅ Generate new secret if not already set
    const secret = speakeasy.generateSecret({
      name: `YourAppName (${user.email})`
    });

    user.google2faSecret = secret.base32;
    await user.save();

    const otpauthUrl = secret.otpauth_url;
    if (!otpauthUrl) {
      return res.status(500).json({ msg: "Invalid secret URL" });
    }

    const qrCode = await qrcode.toDataURL(otpauthUrl);

    res.json({
      qrCode,
      secret: secret.base32
    });

  } catch (error) {
    console.error("Google secret generation error:", error);
    res.status(500).json({ msg: "Error generating secret" });
  }
};


exports.sendEmailCode = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ msg: "User not found" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.emailCode = code;
  user.emailCodeExpires = Date.now() + 90000; // 90 seconds
  await user.save();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Verification Code",
    text: `Your email verification code is: ${code}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ msg: "Failed to send email" });
    }
    res.json({ msg: "OTP sent" });
  });
}

exports.googleAuthenticator =  async (req, res) => {
  const { googleCode, emailCode } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) return res.status(404).json({ msg: "User not found" });

  // Check Google Authenticator code
  const googleVerified = speakeasy.totp.verify({
    secret: user.google2faSecret,
    encoding: "base32",
    token: googleCode,
    window: 1,
  });

  // Check email OTP
  const now = Date.now();
  const emailVerified = user.emailCode === emailCode && user.emailCodeExpires > now;

  if (!googleVerified || !emailVerified) {
    return res.status(400).json({ msg: "Invalid or expired codes" });
  }

  user.google2faEnabled = true;
  user.emailCode = null;
  user.emailCodeExpires = null;
  await user.save();

  res.json({ success: true });
}