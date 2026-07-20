require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, FAQ, Subject, Doubt } = require('./models');

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
    callbackURL: '/auth/google/callback'
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

const requireAdmin = (req, res, next) => {
  const email = req.headers['x-user-email'] || (req.user && req.user.email);
  if (!isAdminEmail(email)) {
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

/* ---------------- Stats ---------------- */

app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    res.json({
      faqs: await FAQ.countDocuments(),
      subjects: await Subject.countDocuments(),
      answered: await Doubt.countDocuments({ status: 'answered' }),
      pending: await Doubt.countDocuments({ status: 'pending' }),
      users: await User.countDocuments()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'FreshStart API is running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server listening on port ' + PORT));
