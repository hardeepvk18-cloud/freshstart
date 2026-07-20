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

module.exports = {
  User: mongoose.model('User', UserSchema),
  FAQ: mongoose.model('FAQ', FAQSchema),
  Subject: mongoose.model('Subject', SubjectSchema),
  Doubt: mongoose.model('Doubt', DoubtSchema)
};
