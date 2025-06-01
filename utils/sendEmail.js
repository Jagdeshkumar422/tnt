const nodemailer = require('nodemailer');

exports.sendOTP = async (email, code) => {
  let transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465, // Use 465 for secure SSL
    secure: true,
    auth: {
      user: 'services@treasurenftx.xyz', // Must match 'from' address
      pass: 'Treasurexnft@1' // Email password (or app password if required)
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
    from: '"Treasure" <services@treasurenftx.xyz>', // ✅ Must match SMTP user
    to: email,
    subject: 'Email Verification Code from Treasure',
    html: htmlTemplate
  });
};
