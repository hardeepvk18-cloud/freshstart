const nodemailer = require('nodemailer');

const FROM = process.env.EMAIL_USER;
const PASS = process.env.EMAIL_PASS;

let transporter = null;

if (FROM && PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: FROM, pass: PASS }
  });
  console.log('Email notifications enabled');
} else {
  console.log('Email not configured - notifications will be skipped');
}

/**
 * Sends an email. Never throws - a failed email must not break a request.
 */
async function sendMail(to, subject, body) {
  if (!transporter || !to) return;
  try {
    await transporter.sendMail({
      from: 'FreshStart <' + FROM + '>',
      to,
      subject,
      text: body
    });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

async function sendMailMany(recipients, subject, body) {
  for (const to of recipients) {
    await sendMail(to, subject, body);
  }
}

module.exports = { sendMail, sendMailMany };
