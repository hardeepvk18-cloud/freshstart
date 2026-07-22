const nodemailer = require('nodemailer');

const HOST = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
const PORT = Number(process.env.EMAIL_PORT) || 587;
const USER = process.env.EMAIL_USER;
const PASS = process.env.EMAIL_PASS;

let transporter = null;

if (USER && PASS) {
  transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: false, // STARTTLS on port 587
    auth: { user: USER, pass: PASS }
  });
  console.log('Email notifications enabled via ' + HOST);
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
      from: 'FreshStart <' + (process.env.EMAIL_FROM || USER) + '>',
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
