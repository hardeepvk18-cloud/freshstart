const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  name: String,
  googleId: String,
  createdAt: { type: Date, default: Date.now }
});

const FAQSchema = new mongoose.Schema({
  category: { type: String, default: 'general' },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  isFree: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const SubjectSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: String,
  credits: Number,
  pool: { type: String, enum: ['A', 'B'] },
  ltp: String,
  attendance: String,
  detain: String,
  topics: [String],
  tips: [String],
  createdAt: { type: Date, default: Date.now }
});

const DoubtSchema = new mongoose.Schema({
  anonId: String,
  subject: { type: String, default: 'General' },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['pending', 'answered'], default: 'pending' },
  answer: String,
  answeredAt: Date,
  upvotes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

/* ---------- mentorship ---------- */

const MentorSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  name: String,
  branch: String,
  year: String,
  topics: [String],
  note: String,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const ThreadSchema = new mongoose.Schema({
  askerEmail: { type: String, required: true },
  topic: { type: String, required: true },
  question: { type: String, required: true },
  status: { type: String, enum: ['open', 'claimed', 'resolved'], default: 'open' },
  mentorEmail: String,
  messages: [{
    from: { type: String, enum: ['fresher', 'senior'] },
    text: String,
    at: { type: Date, default: Date.now }
  }],
  rating: Number,
  isPublic: { type: Boolean, default: false },
  claimedAt: Date,
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const VisitSchema = new mongoose.Schema({
  path: String,
  visitorId: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

const PresenceSchema = new mongoose.Schema({
  visitorId: { type: String, unique: true },
  email: String,
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = {
  User: mongoose.model('User', UserSchema),
  Visit: mongoose.model('Visit', VisitSchema),
  Presence: mongoose.model('Presence', PresenceSchema),
  FAQ: mongoose.model('FAQ', FAQSchema),
  Subject: mongoose.model('Subject', SubjectSchema),
  Doubt: mongoose.model('Doubt', DoubtSchema),
  Mentor: mongoose.model('Mentor', MentorSchema),
  Thread: mongoose.model('Thread', ThreadSchema)
};
