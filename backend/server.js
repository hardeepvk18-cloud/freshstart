require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const { User, FAQ, Subject, Doubt, Mentor, Thread, Visit, Presence } = require('./models');
const { sendMail, sendMailMany } = require('./mailer');

const app = express();
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const ADMINS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(express.json());
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
  passport.authenticate('google', { failureRedirect: FRONTEND + '/?error=login_failed' }),
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

app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeCutoff = new Date(Date.now() - 2 * 60 * 1000); // active in last 2 min

    const [totalVisits, visitsToday, uniqueVisitorIds, activeNow, topPagesRaw] = await Promise.all([
      Visit.countDocuments(),
      Visit.countDocuments({ createdAt: { $gte: dayAgo } }),
      Visit.distinct('visitorId'),
      Presence.countDocuments({ lastSeen: { $gte: activeCutoff } }),
      Visit.aggregate([
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ])
    ]);

    res.json({
      totalVisits,
      visitsToday,
      uniqueVisitors: uniqueVisitorIds.length,
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

app.get('/', (req, res) => res.json({ status: 'FreshStart API is running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server listening on port ' + PORT));
