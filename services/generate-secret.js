// generate-secret.js
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

exports.generateSecret = async (req, res) => {
  const secret = speakeasy.generateSecret({ name: "YourAppName" });

  // Optionally save secret to user model in DB
  // await User.update({ _id: userId }, { googleSecret: secret.base32 });

  const qr = await qrcode.toDataURL(secret.otpauth_url);
  res.json({ secret: secret.base32, qr });
};
