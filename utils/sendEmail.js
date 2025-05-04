const nodemailer = require('nodemailer');

exports.sendOTP = async (email, code) => {
  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'jagdeshk953@gmail.com',
      pass: 'ghgv vdud qlee pcdr'
    }
  });

  await transporter.sendMail({
    from: '"MyApp" <your@gmail.com>',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${code}`
  });
};
