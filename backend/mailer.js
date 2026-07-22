// Uses Brevo's HTTPS API instead of SMTP, because Railway's free/hobby plan
// blocks outbound SMTP ports (25, 465, 587) entirely. HTTPS (port 443) is not blocked.

const API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM;

if (API_KEY && FROM_EMAIL) {
  console.log('Email notifications enabled via Brevo HTTPS API');
} else {
  console.log('Email not configured - notifications will be skipped');
}

/**
 * Sends an email via Brevo's transactional email API. Never throws - a failed
 * email must not break a request.
 */
async function sendMail(to, subject, body) {
  if (!API_KEY || !FROM_EMAIL || !to) return;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'FreshStart', email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        textContent: body
      })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Brevo API error:', res.status, text);
    }
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
