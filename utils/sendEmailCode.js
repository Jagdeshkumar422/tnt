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
        user: 'services@treasurenftx.xyz', // Must match 'from' address
        pass: 'Treasurexnft@1' // Email password (or app password if required)
      }
    });

  await transporter.sendMail({
    from: '"Your App" <services@tresurenftx.xyz>',
    to: email,
    subject: "Your Verification Code",
    text: `Your verification code is ${code}`,
  });

  res.json({ msg: "Code sent" });
};


