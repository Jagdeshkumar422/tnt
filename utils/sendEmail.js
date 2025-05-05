const nodemailer = require('nodemailer');

exports.sendOTP = async (email, code) => {
  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'treasusrexnft@gmail.com',
      pass: 'yucz gkfw cmyv scpm'
    }
  });

  await transporter.sendMail({
    from: '"MyApp" <your@gmail.com>',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${code}`
  });
};
