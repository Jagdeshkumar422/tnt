const nodemailer = require("nodemailer");

exports.sendEmailCode = async (req, res) => {
  const email = req.body.email;
  const code = Math.floor(100000 + Math.random() * 900000);

  // Store code in DB/session with expiration
  await db.saveCodeForEmail(email, code); 

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "treasusrexnft@gmail.com",
      pass: "yucz gkfw cmyv scpm",
    },
  });

  await transporter.sendMail({
    from: '"Your App" <your@gmail.com>',
    to: email,
    subject: "Your Verification Code",
    text: `Your verification code is ${code}`,
  });

  res.json({ msg: "Code sent" });
};


