require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { User, FAQ, Subject, Doubt, Mentor, Thread, Visit, Presence } = require('./models');
const { sendMail, sendMailMany } = require('./mailer');

const app = express();
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const ADMINS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));   // payment screenshots arrive as base64
app.use(cors({ origin: FRONTEND, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err.message));

/* ---------------- Google OAuth ---------------- */

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.OAUTH_CALLBACK_URL || '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value.toLowerCase();

      // only college accounts may sign in; the admin accounts in ADMIN_EMAILS are the exception
      if (!email.endsWith('@thapar.edu') && !ADMINS.includes(email)) {
        return done(null, false, { message: 'thapar_only' });
      }

      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          email,
          name: profile.displayName,
          googleId: profile.id
        });
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
  console.log('Google OAuth enabled');
} else {
  console.log('Google OAuth not configured yet - everything else still works');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); } catch (err) { done(err); }
});

const isAdminEmail = email => !!email && ADMINS.includes(String(email).toLowerCase());

// Only the server can produce a valid token for an email, since it needs SESSION_SECRET.
// The browser cannot forge this by editing a header in devtools.
function makeAdminToken(email) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev_secret')
    .update(String(email).toLowerCase())
    .digest('hex');
}

// feedback left at the bottom of a PYQ guide — visible only in the admin panel
const GuideFeedback = mongoose.models.GuideFeedback || mongoose.model('GuideFeedback', new mongoose.Schema({
  code: { type: String, required: true },
  helpful: { type: Boolean, required: true },
  comment: { type: String, default: '' },
  visitorId: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
}));

/* ---------------- paid access to the solved papers ----------------
   A student pays by UPI, then submits the transaction id and a screenshot.
   Access opens straight away — the screenshot is kept so a fake claim can be
   spotted later and revoked from the admin panel.                          */
const PaymentClaim = mongoose.models.PaymentClaim || mongoose.model('PaymentClaim', new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  code: { type: String, required: true, uppercase: true },   // which subject was paid for
  name: { type: String, default: '' },
  utr: { type: String, required: true, index: true },
  amount: { type: Number, default: 0 },
  screenshot: { type: String, default: '' },      // base64 data URL, resized by the browser
  revoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}));

// each subject is unlocked on its own
/* Set to true to put the solved papers back behind the paywall.
   Everything else (claims, admin panel, unlock page) stays wired up. */
const PAID_MODE = false;

/* Only these subjects are behind the paywall. Everything else stays open to any
   signed-in student, so adding a subject here is what makes it paid.          */
const PAID_CODES = ['UES103', 'UES102'];

async function hasPaidAccess(email, code) {
  const signedIn = !!String(email || '').trim();
  if (!PAID_MODE) return signedIn;
  if (!PAID_CODES.includes(String(code || '').toUpperCase())) return signedIn;
  const e = String(email || '').toLowerCase();
  const c = String(code || '').toUpperCase();
  if (!e || !c) return false;
  if (isAdminEmail(e)) return true;
  return !!(await PaymentClaim.findOne({ email: e, code: c, revoked: false }).select('_id').lean());
}

// every subject this account has unlocked
/* Every subject this account can open: the ones it paid for, plus every subject
   that is not behind the paywall at all.                                     */
async function paidCodes(email) {
  const e = String(email || '').toLowerCase();
  if (!e) return [];
  const codes = new Set();
  if (PAID_MODE) {
    everySubject().forEach(c => { if (!PAID_CODES.includes(c)) codes.add(c); });
  } else {
    everySubject().forEach(c => codes.add(c));
  }
  if (isAdminEmail(e)) { everySubject().forEach(c => codes.add(c)); return [...codes]; }
  const claims = await PaymentClaim.find({ email: e, revoked: false }).select('code').lean();
  claims.forEach(c => codes.add(c.code));
  return [...codes];
}

/* Subject codes that have something to open, read off the files on disk. */
function everySubject() {
  const codes = new Set();
  if (fs.existsSync(SOLUTIONS_DIR)) {
    fs.readdirSync(SOLUTIONS_DIR)
      .filter(f => /-solutions\.html$/.test(f))
      .forEach(f => codes.add(f.split('-')[0].toUpperCase()));
  }
  if (fs.existsSync(GUIDES_FULL_DIR)) {
    fs.readdirSync(GUIDES_FULL_DIR)
      .filter(f => /\.html$/.test(f))
      .forEach(f => codes.add(f.replace(/\.html$/, '').toUpperCase()));
  }
  return [...codes];
}

const requireAdmin = (req, res, next) => {
  const email = String(req.headers['x-user-email'] || '').toLowerCase();
  const token = req.headers['x-admin-token'];
  if (!isAdminEmail(email) || !token || token !== makeAdminToken(email)) {
    return res.status(403).json({ message: 'This account does not have admin access.' });
  }
  next();
};

/* ---------------- Auth routes ---------------- */

app.get('/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.redirect(FRONTEND + '/?error=oauth_not_configured');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: FRONTEND + '/?error=thapar_only' }),
  (req, res) => {
    const params = new URLSearchParams({
      email: req.user.email,
      name: req.user.name || ''
    });
    if (isAdminEmail(req.user.email)) {
      params.set('adminToken', makeAdminToken(req.user.email));
    }
    res.redirect(FRONTEND + '/?' + params.toString());
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

app.get('/api/is-admin', (req, res) => {
  res.json({ isAdmin: isAdminEmail(req.query.email) });
});

/* ---------------- FAQs ---------------- */

app.get('/api/faqs', async (req, res) => {
  try {
    const { category, search, free } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (free === 'true') query.isFree = true;
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } }
      ];
    }
    res.json(await FAQ.find(query).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/faqs', requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await FAQ.create(req.body));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/faqs/:id', requireAdmin, async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ---------------- Subjects ---------------- */

app.get('/api/subjects', async (req, res) => {
  try {
    const query = {};
    if (req.query.pool) query.pool = req.query.pool;
    res.json(await Subject.find(query).sort({ pool: 1, name: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/subjects/:code', async (req, res) => {
  try {
    const subject = await Subject.findOne({ code: req.params.code });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/subjects', requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await Subject.create(req.body));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ---------------- Doubts ---------------- */

app.post('/api/doubts', async (req, res) => {
  try {
    const anonId = 'anon_' + Math.random().toString(36).slice(2, 10);
    const doubt = await Doubt.create({ ...req.body, anonId, status: 'pending' });
    res.status(201).json({ anonId: doubt.anonId });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/doubts', async (req, res) => {
  try {
    res.json(await Doubt.find({ status: 'answered' }).sort({ answeredAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/doubts/pending', requireAdmin, async (req, res) => {
  try {
    res.json(await Doubt.find({ status: 'pending' }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/doubts/:id/reply', requireAdmin, async (req, res) => {
  try {
    const doubt = await Doubt.findByIdAndUpdate(
      req.params.id,
      { answer: req.body.answer, status: 'answered', answeredAt: new Date() },
      { new: true }
    );
    res.json(doubt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/doubts/:id', requireAdmin, async (req, res) => {
  try {
    await Doubt.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/doubts/:id/upvote', async (req, res) => {
  try {
    res.json(await Doubt.findByIdAndUpdate(
      req.params.id,
      { $inc: { upvotes: 1 } },
      { new: true }
    ));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ---------------- Mentorship ---------------- */

const TOPICS = ['Academics', 'Hostel', 'Societies', 'Placements', 'General'];

// who am I - is this email a mentor, and what is their status
app.get('/api/mentors/me', async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase();
    if (!email) return res.json({ mentor: null });
    res.json({ mentor: await Mentor.findOne({ email }) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// apply to become a senior
app.post('/api/mentors/apply', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    if (!email) return res.status(400).json({ message: 'Sign in first' });

    const existing = await Mentor.findOne({ email });
    if (existing) return res.status(400).json({ message: 'You have already applied' });

    const topics = (req.body.topics || []).filter(t => TOPICS.includes(t));
    if (topics.length === 0) {
      return res.status(400).json({ message: 'Pick at least one topic you can help with' });
    }

    const mentor = await Mentor.create({
      email,
      name: req.body.name,
      branch: req.body.branch,
      year: req.body.year,
      topics,
      note: req.body.note
    });
    res.status(201).json(mentor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/mentors/pending', requireAdmin, async (req, res) => {
  try {
    res.json(await Mentor.find({ status: 'pending' }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/mentors/verified', requireAdmin, async (req, res) => {
  try {
    res.json(await Mentor.find({ status: 'verified' }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/mentors/:id/status', requireAdmin, async (req, res) => {
  try {
    const status = req.body.status;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const mentor = await Mentor.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (status === 'verified') {
      sendMail(
        mentor.email,
        'You are now a verified senior on FreshStart',
        'Your application has been approved.\n\nOpen FreshStart and go to the Guidance tab to see questions waiting for a senior.\n\n' + FRONTEND
      );
    }
    res.json(mentor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// a senior updates their own topic coverage - no admin needed, they can only touch their own record
app.patch('/api/mentors/me/topics', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const topics = (req.body.topics || []).filter(t => TOPICS.includes(t));
    if (!email) return res.status(400).json({ message: 'Sign in first' });
    if (topics.length === 0) return res.status(400).json({ message: 'Pick at least one topic' });

    const mentor = await Mentor.findOneAndUpdate(
      { email },
      { topics },
      { new: true }
    );
    if (!mentor) return res.status(404).json({ message: 'No senior profile found for this account' });
    res.json(mentor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// fresher asks a question
app.post('/api/threads', async (req, res) => {
  try {
    const askerEmail = String(req.body.email || '').toLowerCase();
    if (!askerEmail) return res.status(400).json({ message: 'Sign in first' });

    const topic = req.body.topic;
    if (!TOPICS.includes(topic)) {
      return res.status(400).json({ message: 'Pick a topic' });
    }

    const question = String(req.body.question || '').trim();
    if (!question) {
      return res.status(400).json({ message: 'Write your question first' });
    }

    const thread = await Thread.create({ askerEmail, topic, question });

    // notify every verified senior who covers this topic
    const mentors = await Mentor.find({ status: 'verified', topics: topic });
    sendMailMany(
      mentors.map(m => m.email),
      'New ' + topic + ' question on FreshStart',
      'A fresher just asked a question under ' + topic + '.\n\n"' +
      question.slice(0, 200) + (question.length > 200 ? '...' : '') +
      '"\n\nOpen the Guidance tab to claim it.\n\n' + FRONTEND
    );

    res.status(201).json({ _id: thread._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// threads I asked
app.get('/api/threads/mine', async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase();
    if (!email) return res.json([]);
    res.json(await Thread.find({ askerEmail: email }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// unclaimed questions matching a verified senior's topics
app.get('/api/threads/pool', async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase();
    const mentor = await Mentor.findOne({ email, status: 'verified' });
    if (!mentor) return res.status(403).json({ message: 'Not a verified senior' });

    const threads = await Thread.find({ status: 'open', topic: { $in: mentor.topics } })
      .sort({ createdAt: 1 });
    res.json(threads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// threads I claimed
app.get('/api/threads/claimed', async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase();
    res.json(await Thread.find({ mentorEmail: email }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// claim a question
app.patch('/api/threads/:id/claim', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const mentor = await Mentor.findOne({ email, status: 'verified' });
    if (!mentor) return res.status(403).json({ message: 'Not a verified senior' });

    // atomic - only succeeds if still open, so two seniors cannot claim the same thread
    const thread = await Thread.findOneAndUpdate(
      { _id: req.params.id, status: 'open' },
      { status: 'claimed', mentorEmail: email, claimedAt: new Date() },
      { new: true }
    );
    if (!thread) return res.status(400).json({ message: 'Someone else already claimed this one' });

    sendMail(
      thread.askerEmail,
      'A verified senior picked up your question',
      'A verified senior has taken up your question on FreshStart and will reply shortly.\n\n' + FRONTEND
    );

    res.json(thread);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// single thread - only the asker, the assigned mentor, or an admin can open it
app.get('/api/threads/:id', async (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase();
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Not found' });

    const allowed =
      thread.askerEmail === email ||
      thread.mentorEmail === email ||
      isAdminEmail(email) ||
      thread.isPublic;

    if (!allowed) return res.status(403).json({ message: 'Not your thread' });

    const role = thread.askerEmail === email ? 'fresher'
      : thread.mentorEmail === email ? 'senior'
      : 'viewer';

    res.json({ thread, role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// post a message into a thread
app.post('/api/threads/:id/message', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Write something first' });

    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Not found' });
    if (thread.status === 'resolved') {
      return res.status(400).json({ message: 'This thread is closed' });
    }

    let from;
    if (thread.askerEmail === email) from = 'fresher';
    else if (thread.mentorEmail === email) from = 'senior';
    else return res.status(403).json({ message: 'Not your thread' });

    thread.messages.push({ from, text });
    await thread.save();

    if (from === 'senior') {
      sendMail(
        thread.askerEmail,
        'Your question has a new reply',
        'A verified senior replied to your question on FreshStart.\n\n' + FRONTEND
      );
    } else if (thread.mentorEmail) {
      sendMail(
        thread.mentorEmail,
        'New reply on a thread you claimed',
        'The fresher replied on a thread you are helping with.\n\n' + FRONTEND
      );
    }

    res.json(thread);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// fresher closes the thread and rates it
app.patch('/api/threads/:id/resolve', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Not found' });
    if (thread.askerEmail !== email) {
      return res.status(403).json({ message: 'Only the person who asked can close this' });
    }

    const rating = Number(req.body.rating);
    thread.status = 'resolved';
    thread.resolvedAt = new Date();
    if (rating >= 1 && rating <= 5) thread.rating = rating;
    await thread.save();
    res.json(thread);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// fresher chooses to make the conversation public
app.patch('/api/threads/:id/publish', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Not found' });
    if (thread.askerEmail !== email) {
      return res.status(403).json({ message: 'Only the person who asked can publish this' });
    }
    thread.isPublic = !!req.body.isPublic;
    await thread.save();
    res.json(thread);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// public archive of resolved conversations
app.get('/api/threads/public/all', async (req, res) => {
  try {
    const query = { isPublic: true, status: 'resolved' };
    if (req.query.topic && req.query.topic !== 'all') query.topic = req.query.topic;
    const threads = await Thread.find(query)
      .select('topic question messages rating resolvedAt')
      .sort({ resolvedAt: -1 });
    res.json(threads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// admin - every thread, plus the ones nobody has claimed in 12 hours
app.get('/api/admin/threads', requireAdmin, async (req, res) => {
  try {
    res.json(await Thread.find().sort({ createdAt: -1 }).limit(100));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/admin/unclaimed', requireAdmin, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
    res.json(await Thread.find({ status: 'open', createdAt: { $lt: cutoff } }).sort({ createdAt: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- Tracking ---------------- */

app.post('/api/track/visit', async (req, res) => {
  try {
    const { visitorId, email, path } = req.body;
    if (!visitorId) return res.json({ ok: true });
    await Visit.create({ visitorId, email, path });
    await Presence.findOneAndUpdate(
      { visitorId },
      { $set: { email, lastSeen: new Date() }, $setOnInsert: { firstSeen: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true }); // tracking must never break the app
  }
});

app.post('/api/track/heartbeat', async (req, res) => {
  try {
    const { visitorId, email } = req.body;
    if (!visitorId) return res.json({ ok: true });
    await Presence.findOneAndUpdate(
      { visitorId },
      { $set: { email, lastSeen: new Date() }, $setOnInsert: { firstSeen: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});

// anyone reading a guide can leave feedback
app.post('/api/guide-feedback', async (req, res) => {
  try {
    const { code, helpful, comment, visitorId, email } = req.body;
    if (!code || typeof helpful !== 'boolean') {
      return res.status(400).json({ message: 'code and helpful are required' });
    }
    await GuideFeedback.create({
      code: String(code).toUpperCase().slice(0, 12),
      helpful,
      comment: String(comment || '').slice(0, 600),
      visitorId,
      email
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// admin only: counts per guide plus the comments people left
app.get('/api/admin/guide-feedback', requireAdmin, async (req, res) => {
  try {
    const all = await GuideFeedback.find().sort({ createdAt: -1 });
    const byCode = {};
    all.forEach(f => {
      byCode[f.code] = byCode[f.code] || { code: f.code, up: 0, down: 0 };
      byCode[f.code][f.helpful ? 'up' : 'down']++;
    });
    res.json({
      summary: Object.values(byCode).sort((a, b) => (b.up + b.down) - (a.up + a.down)),
      comments: all.filter(f => f.comment).slice(0, 60).map(f => ({
        code: f.code, helpful: f.helpful, comment: f.comment, email: f.email, createdAt: f.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeCutoff = new Date(Date.now() - 2 * 60 * 1000); // active in last 2 min

    /* Midnight this morning in IST. Date.now() is the same number everywhere, so
       shifting it by +5:30 and then reading the UTC date parts gives the Indian
       calendar date whatever timezone the server itself is set to. */
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const shifted = new Date(Date.now() + IST_OFFSET_MS);
    const midnightIST = new Date(Date.UTC(
      shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()
    ) - IST_OFFSET_MS);

    const [totalVisits, visitsLast24h, visitsCalendarToday, uniqueVisitorIds,
           uniqueToday, activeNow, topPagesRaw] = await Promise.all([
      Visit.countDocuments(),
      Visit.countDocuments({ createdAt: { $gte: dayAgo } }),
      Visit.countDocuments({ createdAt: { $gte: midnightIST } }),
      Visit.distinct('visitorId'),
      Visit.distinct('visitorId', { createdAt: { $gte: midnightIST } }),
      Presence.countDocuments({ lastSeen: { $gte: activeCutoff } }),
      Visit.aggregate([
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ])
    ]);

    res.json({
      totalVisits,                                  // every page load and guide open, all time
      visitsToday: visitsLast24h,                   // kept so an older frontend still works
      visitsLast24h,
      visitsCalendarToday,                          // since midnight IST
      uniqueVisitors: uniqueVisitorIds.length,      // distinct browsers, all time
      uniqueToday: uniqueToday.length,              // distinct browsers since midnight IST
      activeNow,
      topPages: topPagesRaw.map(p => ({ path: p._id || 'unknown', count: p.count }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// every distinct email that has ever signed in, most recently active first
app.get('/api/admin/logins', requireAdmin, async (req, res) => {
  try {
    const activeCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const logins = await Presence.find({ email: { $exists: true, $ne: null } })
      .select('email firstSeen lastSeen')
      .sort({ lastSeen: -1 });
    res.json(logins.map(l => ({
      email: l.email,
      firstSeen: l.firstSeen,
      lastSeen: l.lastSeen,
      active: l.lastSeen >= activeCutoff
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- Daily history ----------------
   Every visit is stored as its own document with a timestamp, so the day by day
   record can be rebuilt at any time, including for days already past.        */

app.get('/api/admin/daily', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 60, 1), 365);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const tz = 'Asia/Kolkata';

    const visits = await Visit.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          visits: { $sum: 1 },
          visitors: { $addToSet: '$visitorId' }
      } },
      { $project: { _id: 0, date: '$_id', visits: 1, uniqueVisitors: { $size: '$visitors' } } },
      { $sort: { date: -1 } }
    ]);

    // people who signed in for the first time that day
    let signups = [];
    try {
      signups = await Presence.aggregate([
        { $match: { firstSeen: { $gte: from }, email: { $exists: true, $ne: null } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$firstSeen', timezone: tz } },
            n: { $sum: 1 }
        } }
      ]);
    } catch (e) { signups = []; }
    const signupBy = {};
    signups.forEach(d => { signupBy[d._id] = d.n; });

    // which guide was opened how often, per day
    let guides = [];
    try {
      guides = await Visit.aggregate([
        { $match: { createdAt: { $gte: from }, path: { $regex: '^guide/' } } },
        { $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
              path: '$path'
            },
            n: { $sum: 1 }
        } },
        { $sort: { n: -1 } }
      ]);
    } catch (e) { guides = []; }
    const guideBy = {};
    guides.forEach(g => {
      (guideBy[g._id.date] = guideBy[g._id.date] || []).push({ path: g._id.path, n: g.n });
    });

    res.json({
      timezone: tz,
      generatedAt: new Date().toISOString(),
      days: visits.map(d => ({
        date: d.date,
        visits: d.visits,
        uniqueVisitors: d.uniqueVisitors,
        newSignins: signupBy[d.date] || 0,
        guides: (guideBy[d.date] || []).slice(0, 8)
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- Hour of day ----------------
   Which hours the site is actually used in. Rebuilt from the stored visits, so
   it covers days already past.                                               */

app.get('/api/admin/hourly', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 180);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const tz = 'Asia/Kolkata';

    const rows = await Visit.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: {
          _id: { $hour: { date: '$createdAt', timezone: tz } },
          visits: { $sum: 1 },
          visitors: { $addToSet: '$visitorId' }
      } },
      { $project: { _id: 0, hour: '$_id', visits: 1, devices: { $size: '$visitors' } } }
    ]);

    // every hour present, even the quiet ones, so the shape is honest
    const byHour = {};
    rows.forEach(r => { byHour[r.hour] = r; });
    const hours = [];
    for (let h = 0; h < 24; h++) {
      hours.push({ hour: h, visits: (byHour[h] || {}).visits || 0,
                   devices: (byHour[h] || {}).devices || 0 });
    }

    const busiest = hours.reduce((a, b) => (b.visits > a.visits ? b : a), hours[0]);
    res.json({
      timezone: tz,
      days,
      from: from.toISOString(),
      generatedAt: new Date().toISOString(),
      hours,
      busiestHour: busiest.hour,
      busiestVisits: busiest.visits,
      total: hours.reduce((n, h) => n + h.visits, 0)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- Stats ---------------- */

app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    res.json({
      faqs: await FAQ.countDocuments(),
      subjects: await Subject.countDocuments(),
      answered: await Doubt.countDocuments({ status: 'answered' }),
      pending: await Doubt.countDocuments({ status: 'pending' }),
      users: await User.countDocuments(),
      mentorsPending: await Mentor.countDocuments({ status: 'pending' }),
      mentorsVerified: await Mentor.countDocuments({ status: 'verified' }),
      threadsOpen: await Thread.countDocuments({ status: 'open' }),
      threadsResolved: await Thread.countDocuments({ status: 'resolved' })
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- payments ---------------- */

// a student submits their UPI transaction id; access opens immediately
app.post('/api/payment-claim', async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase();
    const code = String(req.body.code || '').toUpperCase();
    const utr = String(req.body.utr || '').trim();
    if (!email) return res.status(400).json({ message: 'Please sign in first.' });
    if (!/^[A-Z]{3}[0-9]{3}$/.test(code)) return res.status(400).json({ message: 'Unknown subject.' });
    // a UPI reference number is always exactly 12 digits
    if (!/^[0-9]{12}$/.test(utr)) {
      return res.status(400).json({
        message: 'Number poore 12 ank ka hona chahiye. Apne UPI app me payment pe tap karke dekho.'
      });
    }

    // one reference number opens one account, so it cannot be passed around
    const seen = await PaymentClaim.findOne({ utr }).select('email code').lean();
    if (seen && seen.email !== email) {
      return res.status(409).json({
        message: 'Ye number kisi aur account pe pehle use ho chuka hai. Apni payment ka number daalo.'
      });
    }
    if (seen && seen.code === code) {
      return res.json({ ok: true, code });     // already claimed by this student
    }

    let shot = String(req.body.screenshot || '');
    if (shot && !shot.startsWith('data:image/')) shot = '';     // ignore anything that is not an image
    if (shot.length > 700000) shot = '';                        // keep the database small

    await PaymentClaim.create({
      email,
      code,
      name: String(req.body.name || '').slice(0, 80),
      utr,
      amount: Number(req.body.amount) || 0,
      screenshot: shot
    });

    res.json({ ok: true, code });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const SOLUTIONS_DIR = path.join(__dirname, 'solutions');
const GUIDES_FULL_DIR = path.join(__dirname, 'guides-full');

// the frontend asks this on load to decide what the solution cards look like
app.get('/api/access', async (req, res) => {
  try {
    res.json({ codes: await paidCodes(req.query.email) });
  } catch (err) {
    res.json({ codes: [] });
  }
});

/* The solved papers live outside the public folder, so the only way to read
   them is through this route, which checks for a payment first.            */

/* The full guide carries the paid sections and the solutions in one page.
   The free half stays a public file; this is the version behind the payment. */
app.get('/api/guide-full/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    if (!/^[A-Z]{3}[0-9]{3}$/.test(code)) return res.status(400).send('Unknown subject.');

    if (!(await hasPaidAccess(req.query.email, code))) {
      return res.status(402).send(lockedPage(code));
    }

    const file = path.join(GUIDES_FULL_DIR, code + '.html');
    if (!fs.existsSync(file)) return res.status(404).send('That guide is not up yet.');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    res.status(500).send('Something went wrong.');
  }
});

function lockedPage(code) {
  return '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<div style="font-family:system-ui,sans-serif;max-width:520px;margin:18vh auto;padding:0 20px;text-align:center;color:#16202C">' +
    '<h2 style="font-weight:700">This part opens after payment</h2>' +
    '<p style="color:#4A5866;line-height:1.6">Open FreshStart, go to this subject and unlock it there. ' +
    'If you have already paid, sign in with the same Thapar email you used.</p>' +
    '<p><a href="' + FRONTEND + '/#unlock=' + code + '" style="color:#0F766E;font-weight:600">Unlock it on FreshStart</a></p></div>';
}

app.get('/api/solutions/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    if (!/^[A-Z]{3}[0-9]{3}$/.test(code)) return res.status(400).send('Unknown subject.');

    if (!(await hasPaidAccess(req.query.email, code))) {
      return res.status(402).send(lockedPage(code));
    }

    const file = path.join(SOLUTIONS_DIR, code + '-solutions.html');
    if (!fs.existsSync(file)) return res.status(404).send('Those solutions are not up yet.');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    res.status(500).send('Something went wrong.');
  }
});

/* ---------------- payments, admin side ---------------- */

app.get('/api/admin/payment-claims', requireAdmin, async (req, res) => {
  try {
    const claims = await PaymentClaim.find()
      .select('-screenshot')                      // the list stays light; screenshots load one at a time
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    const total = claims.filter(c => !c.revoked).reduce((s, c) => s + (c.amount || 0), 0);
    res.json({ claims, activeCount: claims.filter(c => !c.revoked).length, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/admin/payment-claims/:id/screenshot', requireAdmin, async (req, res) => {
  try {
    const c = await PaymentClaim.findById(req.params.id).select('screenshot').lean();
    res.json({ screenshot: (c && c.screenshot) || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/admin/payment-claims/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const c = await PaymentClaim.findByIdAndUpdate(
      req.params.id,
      { revoked: req.body.revoked !== false },
      { new: true }
    ).select('-screenshot');
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'FreshStart API is running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server listening on port ' + PORT));
