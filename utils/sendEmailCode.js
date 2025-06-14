const nodemailer = require("nodemailer");

exports.sendEmailCode = async (req, res) => {
  const email = req.body.email;
  const code = Math.floor(100000 + Math.random() * 900000);

  // Store code in DB/session with expiration
  await db.saveCodeForEmail(email, code); 

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
    from: '"Pixel NFT" <pixelnft@pixelnft.pro>',
    to: email,
    subject: "Your Verification Code",
    text: `Your verification code is ${code}`,
  });

  res.json({ msg: "Code sent" });
};


