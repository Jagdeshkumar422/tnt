const nodemailer = require('nodemailer');

exports.sendOTP = async (email, code) => {
  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'treasusrexnft@gmail.com',
      pass: 'yucz gkfw cmyv scpm'  // Make sure this app password is valid and kept secret
    }
  });

  const htmlTemplate = `
    <p>Greetings,</p>

    <p>Below is your email verification code from Treasure.</p>

    <p>To complete this email verification, please enter the code and proceed to the next step:</p>

    <h2>${code}</h2>

    <p>(This code will be valid for 15 minutes after request and available to resend if it expires.)</p>

    <p>Thank you!<br/>
    <small>**This notice is automatically sent by system. Please do not reply to this address.</small></p>

    <p>If you have any questions, please contact us from the app for further information.</p>
  `;

  await transporter.sendMail({
    from: '"Treasure" <treasusrexnft@gmail.com>',
    to: email,
    subject: 'Email Verification Code from Treasure',
    html: htmlTemplate
  });
};
