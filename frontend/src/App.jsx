import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

/* ---------------- session helper ---------------- */

const Auth = {
  get() {
    try {
      const email = localStorage.getItem('fs_email');
      return email ? { email, name: localStorage.getItem('fs_name') || '' } : null;
    } catch {
      return null;
    }
  },
  set(email, name, adminToken) {
    localStorage.setItem('fs_email', email);
    localStorage.setItem('fs_name', name || '');
    if (adminToken) localStorage.setItem('fs_admin_token', adminToken);
  },
  clear() {
    localStorage.removeItem('fs_email');
    localStorage.removeItem('fs_name');
    localStorage.removeItem('fs_admin_token');
  },
  adminHeaders(email) {
    return {
      'Content-Type': 'application/json',
      'x-user-email': email,
      'x-admin-token': localStorage.getItem('fs_admin_token') || ''
    };
  }
};

function getVisitorId() {
  try {
    let id = localStorage.getItem('fs_visitor');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : 'v_' + Math.random().toString(36).slice(2) + Date.now());
      localStorage.setItem('fs_visitor', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

const startLogin = () => { window.location.href = API + '/auth/google'; };

/* ---------------- shared pieces ---------------- */

function LoginGate({ title, text }) {
  return (
    <div className="gate">
      <span className="lock">🔒</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <ul className="perks">
        <li><b>✦</b>PYQ solutions and analysis for all nine subjects</li>
        <li><b>✦</b>Every FAQ, fully unlocked</li>
        <li><b>✦</b>Topper tips for all ten subjects</li>
        <li><b>✦</b>The full answered doubts archive</li>
      </ul>
      <br />
      <button className="btn btn-lg" onClick={startLogin}>Sign in with Thapar email</button>
      <p className="note" style={{ marginTop: '.8rem' }}>Only @thapar.edu accounts can sign in.</p>
    </div>
  );
}

// records a guide open so the admin panel's Top pages shows which guides get used
function trackGuideOpen(code, user) {
  fetch(API + '/api/track/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      email: user ? user.email : undefined,
      path: 'guide/' + code
    })
  }).catch(() => {});
}

/* feedback on the PYQ section as a whole — separate from the per-guide boxes */
function SectionFeedback({ user }) {
  const [choice, setChoice] = useState(null);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [already, setAlready] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem('fs_section_fb')) setAlready(true); } catch (e) {}
  }, []);

  function post(helpful, comment) {
    fetch(API + '/api/guide-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'SECTION',
        helpful,
        comment: comment || '',
        visitorId: getVisitorId(),
        email: user ? user.email : undefined
      })
    }).catch(() => {});
  }

  function pick(val) {
    setChoice(val);
    post(val, '');
  }

  function send() {
    if (choice === null) return;
    post(choice, text);
    try { localStorage.setItem('fs_section_fb', '1'); } catch (e) {}
    setSent(true);
  }

  if (already) return null;

  return (
    <div
      className="highlight"
      style={{
        margin: '2rem 0',
        border: '2px solid #6c63ff',
        background: 'rgba(108, 99, 255, .1)',
        boxShadow: '0 10px 30px rgba(108, 99, 255, .18)'
      }}
    >
      <span>&#128172;</span>
      <div style={{ width: '100%' }}>
        <b style={{ fontSize: '1.05rem' }}>Did these guides help you?</b>
        {sent ? (
          <p style={{ marginTop: '.5rem' }}>Thanks — this genuinely helps. Good luck in the exam.</p>
        ) : (
          <>
            <p>
              These guides are made by a student, for students — free, no ads, and built by reading
              every past paper by hand. If they helped you, please vote and write a line about what
              worked. And tell us which subject's guide you want next.
            </p>
            <div className="tags" style={{ marginTop: '.9rem' }}>
              <button
                className={'btn btn-sm' + (choice === true ? '' : ' btn-ghost')}
                onClick={() => pick(true)}
              >&#128077; Yes, it helped</button>
              <button
                className={'btn btn-sm' + (choice === false ? '' : ' btn-ghost')}
                onClick={() => pick(false)}
              >&#128078; Not really</button>
            </div>
            {choice !== null && (
              <>
                <label className="field" style={{ marginTop: '.9rem', display: 'block' }}>
                  <textarea
                    placeholder="What helped, and which subject's guide should come next?"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{ minHeight: '80px' }}
                  />
                </label>
                <button className="btn btn-sm" onClick={send}>Send</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const Spinner = () => <div className="spinner" />;

/* ---------------- pages ---------------- */

/* A student-run site, not an official Thapar page. Shown on the main pages. */
function NotOfficial({ withErrorNote }) {
  return (
    <div style={{
      margin: '1.2rem 0', padding: '.85rem 1.05rem', borderRadius: '10px',
      background: '#F4F4F7', border: '1px solid #DEDEE6',
      color: '#5A5A6E', fontSize: '.82rem', lineHeight: 1.6
    }}>
      FreshStart is built and run by one Thapar student, on their own.
      It is not an official TIET page and has no connection with the institute or its administration.
      {withErrorNote ? ' The solutions here were written with the help of AI, so a step can be wrong \u2014 always check against your own working, and tell us if you spot a mistake.' : ''}
    </div>
  );
}

function Home({ go }) {
  return (
    <div className="hero">
      <div className="hero-in">
        <h2 className="hero-title">Start first year <em>knowing what to expect</em></h2>
        <p>
          PYQ solutions, subject guides, attendance rules, detention risk and answers from
          people who already survived it. Sign in with your @thapar.edu email to open everything.
        </p>

        <div className="mini-grid">
          <div className="mini" onClick={() => go('subjects')}><i>📚</i><h4>Subjects</h4><p>Pool A and B</p></div>
          <div className="mini" onClick={() => go('faqs')}><i>❓</i><h4>FAQs</h4><p>Real answers</p></div>
          <div className="mini" onClick={() => go('doubts')}><i>💬</i><h4>Doubts</h4><p>Ask anonymously</p></div>
          <div className="mini" onClick={() => go('pyq')}><i>📊</i><h4>PYQ Guides</h4><p>What repeats in MSTs</p></div>
          <div className="mini" onClick={() => go('solutions')}><i>✎</i><h4>Solved PYQs</h4><p>Past papers worked out</p></div>
        </div>

        <NotOfficial />

        <div className="senior-cta" onClick={() => go('pyq')} style={{ marginBottom: '1.2rem' }}>
          <div className="senior-cta-in">
            <span className="live">new</span>
            <h3>PYQ solutions &mdash; papers solved step by step</h3>
            <p>Every question from the past MST papers worked out the way you would write it in the answer sheet, with the method named at each step. Plus which topics repeat, a formula sheet, and the full papers to practise on.</p>
            <span className="senior-cta-go">Open the solutions &rarr;</span>
          </div>
        </div>

        <div className="senior-cta" onClick={() => go('guidance')}>
          <div className="senior-cta-in">
            <span className="live">live</span>
            <h3>Chat one to one with a verified senior</h3>
            <p>Write out whatever you are stuck on. A verified third year student answers soon, and you can keep chatting until it is sorted. Both sides stay anonymous.</p>
            <span className="senior-cta-go">Ask a senior &rarr;</span>
          </div>
        </div>

        <div className="hero-btns">
          <button className="btn btn-lg btn-ghost" onClick={() => go('faqs')}>Browse the guide</button>
        </div>
      </div>
    </div>
  );
}

function FAQs({ user }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = ['all', 'general', 'academics', 'campus', 'hostel'];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    if (!user) params.set('free', 'true');

    fetch(API + '/api/faqs?' + params.toString())
      .then(r => r.json())
      .then(d => setFaqs(Array.isArray(d) ? d : []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, [search, category, user]);

  return (
    <div className="wrap">
      <h2>Frequently asked questions</h2>
      <p className="sub">The things every fresher asks in the first month.</p>

      {!user && <div className="banner">Free preview. Sign in with your Thapar email to see the full set.</div>}

      <input
        className="search"
        placeholder="Search questions and answers"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="filters">
        {categories.map(c => (
          <button key={c} className={'chip' + (category === c ? ' on' : '')} onClick={() => setCategory(c)}>
            {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : faqs.length === 0 ? (
        <div className="empty">No questions match that search. Try a different word.</div>
      ) : (
        <div className="list">
          {faqs.map((f, i) => (
            <div className="card" key={f._id} style={{ animationDelay: i * 0.04 + 's' }}>
              <h4>{f.question}</h4>
              <p>{f.answer}</p>
            </div>
          ))}
        </div>
      )}

      {!user && !loading && (
        <LoginGate
          title="There is more below this"
          text="Sign in with your @thapar.edu email to open the rest of the questions. It takes about ten seconds."
        />
      )}
    </div>
  );
}

function Subjects({ user, go }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState('A');

  useEffect(() => {
    setLoading(true);
    fetch(API + '/api/subjects?pool=' + pool)
      .then(r => r.json())
      .then(d => setSubjects(Array.isArray(d) ? d : []))
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, [pool]);



  return (
    <div className="wrap">
      <h2>Subject guide</h2>
      <p className="sub">
        Your pool is not fixed by branch in the first semester. Roughly half the batch gets
        Pool A and half gets Pool B, and the order flips in semester two.
      </p>

      <div className="filters">
        <button className={'chip' + (pool === 'A' ? ' on' : '')} onClick={() => setPool('A')}>Pool A</button>
        <button className={'chip' + (pool === 'B' ? ' on' : '')} onClick={() => setPool('B')}>Pool B</button>
      </div>

      {!user && (
        <p className="note" style={{ marginBottom: '1.2rem' }}>
          {OPEN_CODES.map(c => (subjects.find(s2 => s2.code === c) || {}).name).filter(Boolean).join(' and ') || 'One subject per pool'} is open to everyone as a sample. Sign in with your Thapar email to open the rest.
        </p>
      )}

      {loading ? <Spinner /> : (
        <div className="grid">
          {subjects.map((s, i) => (
            <div
              className="card clickable"
              key={s._id}
              style={{ animationDelay: i * 0.06 + 's' }}
              onClick={() => go('subject', s.code)}
            >
              <h3>{s.name}{(!user && !OPEN_CODES.includes(s.code)) ? ' 🔒' : ''}</h3>
              <p>{s.code} · {s.credits} credits · L-T-P {s.ltp}</p>
              <div className="tags">
                <span className="tag">Attendance: {s.attendance}</span>
                <span className={'tag ' + (s.detain === 'Low' ? 'ok' : s.detain === 'High' ? 'warn' : '')}>
                  Detention risk: {s.detain}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const GUIDES = [
  { code: 'UCB009', name: 'Chemistry', pool: 'A', papers: 4, note: 'Spectroscopy carried 77% of marks across four papers' },
  { code: 'UES013', name: 'Electrical & Electronics', pool: 'A', papers: 5, note: 'Nodal analysis and Thevenin appeared in all five papers' },
  { code: 'UMA010', name: 'Mathematics I', pool: 'A', papers: 3, note: 'Five topics appeared in every paper — 72% of marks' },
  { code: 'UEN008', name: 'Energy & Environment', pool: 'A', papers: 5, note: 'BOD/COD numericals in every paper since Oct 2024' },
  { code: 'UES103', name: 'C Programming', pool: 'A', papers: 5, note: 'The paper now tests reading code, not writing it' },
  { code: 'UMA004', name: 'Mathematics II', pool: 'B', papers: 3, note: 'Mar 2026 repeated 7 of 9 parts from Mar 2025' },
  { code: 'UPH013', name: 'Physics', pool: 'B', papers: 4, note: 'Five topics in all four papers — 79% of marks' },
  { code: 'UES102', name: 'Manufacturing Processes', pool: 'B', papers: 5, note: 'A CNC program in every paper, always Question 1(a)' },
  { code: 'PHU003', name: 'Professional Communication', pool: 'B', papers: 2, note: '3 of 5 questions in 2025 repeated 2024 topics' }
];
const GUIDE_CODES = GUIDES.map(g => g.code);

// fully worked solutions to the past papers — a separate thing from the analysis guides
const SOLUTIONS = [
  {
    code: 'UMA004',
    file: 'UMA004-solutions.html',
    name: 'Mathematics II',
    pool: 'B',
    papers: 3,
    parts: 26,
    note: 'Every part of the Mar 2024, Mar 2025 and Mar 2026 papers, solved step by step'
  },
  {
    code: 'UES102',
    file: 'UES102-solutions.html',
    name: 'Manufacturing Processes',
    pool: 'B',
    papers: 5,
    parts: 37,
    note: 'All five MST papers solved — every CNC program written out and every numerical checked twice'
  },
  {
    code: 'UES013',
    file: 'UES013-solutions.html',
    // served from the frontend for now: Railway deploys are paused, so the
    // backend copy cannot go live yet. Move this back once Railway recovers.
    staticFile: true,
    name: 'Electrical & Electronics',
    pool: 'A',
    papers: 5,
    parts: 46,
    note: 'All five MST papers solved — every network re-solved a second way and every transient checked against the differential equation'
  },
  {
    code: 'UES103',
    file: 'UES103-solutions.html',
    name: 'C Programming',
    pool: 'A',
    papers: 5,
    parts: 30,
    note: 'Five papers solved — every program compiled and run to check its output'
  }
];

/* ---- change these two and nothing else to alter the price or the UPI id ---- */
/* Set to true to put the solved papers back behind the paywall.
   The unlock page, the claim form and the admin panel all stay in place. */
const PAID_MODE = false;
const PRICE = 29;
const UPI_QR = "data:image/png;base64,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";
const UPI_ID = 'harpuneet61-1@oksbi';

/* ---- mock papers ----------------------------------------------------------
   A different product from the solved papers, so it carries its own price and
   its own codes. The codes keep the ^[A-Z]{3}[0-9]{3}$ shape that the unlock
   router, the claim endpoint and the file route all check, so nothing else
   needed changing to make these payable.
   The free file is a public page; the full one is served by the backend only
   after a payment, which is why it must live in backend/solutions/ and never
   in frontend/public/.                                                       */
const MOCK_PRICE = 29;
const MOCKS = [
  {
    code: 'MOK102', subject: 'UES102', name: 'Manufacturing Processes',
    free: 'UES102-mock-free.html',
    questions: 8, marks: 60, papers: 5, methods: 16, steps: 83, figures: 5, coverage: 87,
    note: 'Eight questions covering every type the last five papers asked, each with the method written out as steps you can follow on any question of that type'
  },
  {
    code: 'MOK013', subject: 'UES013', name: 'Electrical & Electronics',
    free: 'UES013-mock-free.html',
    questions: 8, marks: 60, papers: 5, methods: 19, steps: 99, figures: 3, coverage: 88,
    note: 'Thevenin, Norton and superposition each written out as their own procedure, plus nodal against mesh, and every network checked a second way'
  }
];

const isMockCode = c => MOCKS.some(m => m.code === c);
const priceFor = c => (isMockCode(c) ? MOCK_PRICE : PRICE);

// one free sample subject per pool — everything else needs a Thapar sign-in
const OPEN_CODES = ['UEN008', 'UES102'];

// the guides that are open without a sign-in come first in their pool
function sortGuides(list, user) {
  if (user) return list;
  return [...list].sort((a, b) => (OPEN_CODES.includes(b.code) ? 1 : 0) - (OPEN_CODES.includes(a.code) ? 1 : 0));
}

/* 14 -> "2 pm", 0 -> "12 am" — hours read better than 24-hour numbers in prose */
function fmtHour(h) {
  const am = h < 12;
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return twelve + (am ? ' am' : ' pm');
}

/* Turn the day by day record into a file worth keeping. A dashboard can be
   reset or rebuilt; a downloaded CSV cannot. */
function downloadDailyCsv(daily, hourly) {
  const rows = [['date', 'visits', 'unique_visitors', 'new_signins', 'guides_opened']];
  daily.days.forEach(d => {
    rows.push([
      d.date,
      d.visits,
      d.uniqueVisitors,
      d.newSignins,
      d.guides.map(g => g.path + '=' + g.n).join(' ')
    ]);
  });

  if (hourly && hourly.hours) {
    rows.push([]);
    rows.push(['hour_of_day_' + hourly.timezone, 'visits', 'devices', 'window_days', '']);
    hourly.hours.forEach(h => rows.push([String(h.hour).padStart(2, '0'), h.visits, h.devices, hourly.days, '']));
  }
  const csv = rows.map(r => r.map(v => {
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'freshstart-daily-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function GuideCard({ g, i, user }) {
  const open = user || OPEN_CODES.includes(g.code);
  const inner = (
    <>
      <h3>{g.name}{open ? '' : ' 🔒'}</h3>
      <p>{g.code} · Pool {g.pool} · built from {g.papers} MST papers</p>
      <p style={{ marginTop: '.6rem', color: '#5b54d6', fontSize: '.9rem' }}>{g.note}</p>
      <div className="tags" style={{ marginTop: '.9rem' }}>
        <span className="tag">Must-do topics</span>
        <span className="tag">Formula sheet</span>
        <span className="tag">Common mistakes</span>
        <span className="tag">Full papers</span>
      </div>
    </>
  );

  if (!open) {
    return (
      <div
        className="card clickable"
        key={g.code}
        onClick={startLogin}
        role="button"
        style={{ animationDelay: i * 0.06 + 's', opacity: .85 }}
      >
        {inner}
        <p
          style={{
            marginTop: '.9rem', padding: '.55rem .8rem', borderRadius: '10px',
            background: 'rgba(108, 99, 255, .12)', border: '1px solid rgba(108, 99, 255, .35)',
            color: '#4f48c4', fontSize: '.85rem', fontWeight: 600
          }}
        >
          🔒 Tap to sign in with your Thapar email and open this guide
        </p>
      </div>
    );
  }

  return (
    <a
      className="card clickable"
      href={'/guides/' + g.code + '.html'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackGuideOpen(g.code, user)}
      key={g.code}
      style={{ animationDelay: i * 0.06 + 's', textDecoration: 'none', display: 'block' }}
    >
      {inner}
    </a>
  );
}

const noteStyle = {
  marginTop: '.9rem', padding: '.55rem .8rem', borderRadius: '10px',
  background: 'rgba(108, 99, 255, .12)', border: '1px solid rgba(108, 99, 255, .35)',
  color: '#4f48c4', fontSize: '.85rem', fontWeight: 600
};

/* ---- unlock page: pay by UPI, then enter the transaction id ---- */
function Unlock({ user, go, onPaid, code }) {
  const mock = MOCKS.find(m => m.code === code);
  const subject = mock || SOLUTIONS.find(s => s.code === code);
  const price = priceFor(code);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    const ref = utr.replace(/\s/g, '');
    if (!/^[0-9]{12}$/.test(ref)) {
      setMsg('Number poore 12 ank ka hona chahiye. Apne UPI app me payment pe tap karke dekho.');
      return;
    }
    setBusy(true); setMsg('');

    async function attempt() {
      const r = await fetch(API + '/api/payment-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email, name: user.name || '', code,
          utr: ref, amount: price
        })
      });
      let d = {};
      try { d = await r.json(); } catch (e) {}
      return { ok: r.ok, d };
    }

    let res = null;
    try {
      res = await attempt();
    } catch (e) { res = null; }

    if (res && res.ok) {
      onPaid(code);
      // Paid for a mock, so open the paper itself right away rather than
      // dropping the student on another page to go looking for it. Same-tab
      // navigation, so no popup blocker gets in the way.
      if (mock) {
        window.location.href = API + '/api/solutions/' + code +
          '?email=' + encodeURIComponent(user.email);
        return;
      }
      go('pyq');
      return;
    }

    setMsg(res && res.d && res.d.message
      ? res.d.message
      : 'Server tak request nahi pahunchi. Thodi der baad dobara try karo — paisa kata hai toh access pakka milega.');
    setBusy(false);
  }

  return (
    <div className="wrap">
      <h2>Unlock {mock ? mock.name + ' mock paper' : subject ? subject.name : 'these solutions'}</h2>
      <p className="sub">
        {mock
          ? '₹' + price + ' opens the other ' + (mock.questions - 1) + ' questions of the ' + mock.subject +
            ' mock — ' + mock.marks + ' marks in all, each question worked out in full with the method written ' +
            'out as steps. The first question stays free so you can see the standard before paying.'
          : '₹' + price + ' opens the solved papers for ' +
            (subject ? subject.name + ' (' + subject.code + ')' : 'this subject') +
            (subject ? ' — all ' + subject.parts + ' questions from ' + subject.papers + ' past papers, ' : ' ') +
            'worked out step by step. The analysis guides stay free for everyone.'}
      </p>

      <div className="sec-title" style={{ marginTop: '1.6rem' }}>Step 1 — pay ₹{price}</div>

      <div className="card" style={{ textAlign: 'center', padding: '1.4rem 1rem' }}>
        <img src={UPI_QR} alt="UPI QR"
          style={{ width: '190px', maxWidth: '64%', borderRadius: '12px' }} />
        <p className="note" style={{ marginTop: '.7rem', marginBottom: '1.1rem' }}>
          Scan with any UPI app and send <b>₹{price}</b>
        </p>

        <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: '1rem' }}>
          <p className="note" style={{ margin: 0 }}>On your phone? Use the UPI id instead</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#5b54d6', wordBreak: 'break-all', margin: '.35rem 0 0' }}>
            {UPI_ID}
          </p>
          <button className="btn btn-sm" style={{ marginTop: '.6rem' }}
            onClick={() => {
              try {
                navigator.clipboard.writeText(UPI_ID);
                setMsg('UPI id copied — paste it in your UPI app.');
              } catch (e) { setMsg('Copy it by hand: ' + UPI_ID); }
            }}>
            Copy UPI id
          </button>
          <p className="note" style={{ marginTop: '.7rem' }}>
            Open any UPI app, paste this id, send ₹{price}.
          </p>
        </div>
      </div>

      <div className="sec-title" style={{ marginTop: "1.8rem" }}>Step 2 — enter the 12-digit number</div>
      <p className="note" style={{ marginTop: 0 }}>
        Har payment ka ek <b>12-digit number</b> hota hai. Wahi daalna hai — uske baad solutions
        turant khul jayega.
      </p>

      <div style={{
        marginTop: '.9rem', padding: '.9rem 1rem', borderRadius: '10px',
        background: '#F4F6FB', border: '1px solid #DCE2F0', fontSize: '.86rem', lineHeight: 1.65
      }}>
        <b style={{ display: 'block', marginBottom: '.4rem' }}>Wo number kahan milega</b>
        <div style={{ color: '#4A5866' }}>
          <b>PhonePe</b> &mdash; History → jo payment abhi ki uspe tap karo → neeche
          <i> UTR</i> likha hoga<br />
          <b>Google Pay</b> &mdash; payment pe tap karo → <i>UPI transaction ID</i><br />
          <b>Paytm</b> &mdash; payment pe tap karo → <i>UPI Ref No.</i><br />
          <b>Koi bhi app</b> &mdash; jo 12 ank ka lamba number dikhe, wahi hai
        </div>
      </div>

      <label className="field" style={{ display: 'block', marginTop: '.9rem' }}>
        <input placeholder="12-digit number" value={utr}
          inputMode="numeric" maxLength={14}
          onChange={e => setUtr(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))} />
        <span className="note" style={{
          display: 'block', marginTop: '.35rem',
          color: utr.length === 12 ? '#0c7057' : undefined,
          fontWeight: utr.length === 12 ? 600 : undefined
        }}>
          {utr.length === 0
            ? 'Sirf ank — 12 ka 12'
            : utr.length === 12
              ? '12 / 12 — theek hai'
              : utr.length + ' / 12 ank'}
        </span>
      </label>

      <button className="btn" style={{ marginTop: '1rem' }} onClick={submit} disabled={busy}>
        {busy ? 'Khol raha hoon…' : 'Unlock karo'}
      </button>
      {msg && <p className="note" style={{ color: '#b91c1c' }}>{msg}</p>}

      <p className="note" style={{ marginTop: '1.6rem' }}>
        Paying with a different account than the one you signed in with is fine — access is tied to
        the Thapar email you are signed in as ({user.email}). Trouble? Ask in Doubts and it gets sorted.
      </p>
    </div>
  );
}

/* ---- Mock papers: the paid section, kept apart from the free solved papers ---- */
function MockCard({ m, i, user, paid, go }) {
  const owned = paid.includes(m.code);
  const body = (
    <>
      <h3>{m.name}{user ? '' : ' 🔒'}</h3>
      <p>{m.subject} · {m.questions} questions · {m.marks} marks · built from {m.papers} past papers</p>
      <p style={{ marginTop: '.6rem', color: '#5b54d6', fontSize: '.9rem' }}>{m.note}</p>
      <div className="tags" style={{ marginTop: '.9rem' }}>
        <span className="tag">{m.coverage}% of the marks</span>
        <span className="tag">{m.methods} methods written out</span>
        <span className="tag">{m.steps} steps</span>
        {m.figures > 0 && <span className="tag">{m.figures} diagrams</span>}
        <span className="tag">If it comes differently</span>
      </div>
    </>
  );

  if (!user) {
    return (
      <div className="card clickable" onClick={startLogin} role="button"
        style={{ animationDelay: i * 0.06 + 's', opacity: .85 }}>
        {body}
        <p style={noteStyle}>🔒 Tap to sign in with your Thapar email</p>
      </div>
    );
  }

  // One way in. The paper itself carries what is included, what it costs and
  // how to pay, so none of that is repeated out here.
  return (
    <a className="card clickable"
      href={owned
        ? API + '/api/solutions/' + m.code + '?email=' + encodeURIComponent(user.email)
        : '/solutions/' + m.free}
      target="_blank" rel="noopener noreferrer"
      onClick={() => trackGuideOpen(m.code + (owned ? '-FULL' : '-FREE'), user)}
      style={{ animationDelay: i * 0.06 + 's', textDecoration: 'none', display: 'block' }}>
      {body}
    </a>
  );
}

function MockPapers({ user, go, paid }) {
  return (
    <div className="wrap">
      <h2>Mock papers</h2>
      <p className="sub">
        If you have barely started, this is the one thing worth doing tonight.
      </p>

      <div className="highlight" style={{ marginTop: '1.3rem' }}>
        <span>&#9998;</span>
        <div>
          <b>Why one paper is enough to cover most of the subject</b>
          <p>
            These are not eight random questions. We read all five past MST papers, counted what every
            topic was worth, and then wrote one question for each topic that keeps coming back. The
            topics these eight cover carried close to <b>90% of the marks</b> in those five papers.
          </p>
          <p style={{ marginTop: '.6rem' }}>
            And no question is just solved and left there. Each one carries its method written out as
            numbered steps, so you can follow it on whatever version of that question your paper
            actually has &mdash; and underneath, what changes when the same topic is asked a different
            way. That is the part that turns one paper into revision for the whole subject.
          </p>
          <p style={{ marginTop: '.6rem' }}>
            Work through one properly and very little in the MST should look unfamiliar. Open either
            one below and see for yourself.
          </p>
        </div>
      </div>

      <div className="grid" style={{ marginTop: '1.4rem' }}>
        {MOCKS.map((m, i) => <MockCard key={m.code} m={m} i={i} user={user} paid={paid} go={go} />)}
      </div>
    </div>
  );
}

/* ---- Solved PYQs: its own section again, one card per subject ---- */
const SOLVED_CODES = SOLUTIONS.map(s => s.code);

function SolutionCard({ s, i, user }) {
  const inner = (
    <>
      <h3>{s.name}{user ? '' : ' 🔒'}</h3>
      <p>{s.code} · Pool {s.pool} · {s.papers} papers · {s.parts} questions solved</p>
      <p style={{ marginTop: '.6rem', color: '#5b54d6', fontSize: '.9rem' }}>{s.note}</p>
      <div className="tags" style={{ marginTop: '.9rem' }}>
        <span className="tag">Step-by-step</span>
        <span className="tag">Method named</span>
        <span className="tag">Common slips</span>
        <span className="tag">Year-wise</span>
      </div>
    </>
  );

  if (!user) {
    return (
      <div className="card clickable" onClick={startLogin} role="button"
        style={{ animationDelay: i * 0.06 + 's', opacity: .85 }}>
        {inner}
        <p style={noteStyle}>🔒 Tap to sign in with your Thapar email</p>
      </div>
    );
  }

  // `staticFile` means the page is served from the frontend instead of the backend.
  // Used when a subject's solutions need to go live before the backend can deploy.
  return (
    <a className="card clickable"
      href={s.staticFile
        ? '/solutions/' + s.file
        : API + '/api/solutions/' + s.code + '?email=' + encodeURIComponent(user.email)}
      target="_blank" rel="noopener noreferrer"
      onClick={() => trackGuideOpen(s.code + '-SOL', user)}
      style={{ animationDelay: i * 0.06 + 's', textDecoration: 'none', display: 'block' }}>
      {inner}
    </a>
  );
}

function PyqSolutions({ user, go }) {
  return (
    <div className="wrap">
      <h2>Past PYQ solutions</h2>
      <p className="sub">
        The analysis guides tell you which questions come. These go one step further &mdash; every
        question from the past papers worked out fully, the way you would write it in the answer
        sheet, with the method named at each step.
      </p>

      <div className="highlight" style={{ marginTop: '1.4rem' }}>
        <span>&#9998;</span>
        <div>
          <b>What's inside</b>
          <p>
            Each paper, year by year &middot; every part solved step by step &middot; the method named
            &middot; the final answer set apart &middot; and a note wherever students commonly lose marks.
          </p>
        </div>
      </div>

      <div className="grid" style={{ marginTop: '1.4rem' }}>
        {SOLUTIONS.map((s, i) => <SolutionCard s={s} i={i} user={user} key={s.code} />)}
      </div>

      <div className="highlight" style={{ marginTop: '1.6rem' }}>
        <span>&#9998;</span>
        <div>
          <b>Short on time before the MST?</b>
          <p>
            There are mock papers for{' '}
            {MOCKS.map(m => m.subject).join(' and ')} &mdash; eight questions that between them cover
            every type these papers repeat, each with the method written out as steps.
          </p>
          <button className="btn btn-sm" style={{ marginTop: '.6rem' }}
            onClick={() => go('mocks')}>See the mock papers</button>
        </div>
      </div>

      <div className="sec-title" style={{ marginTop: '2.2rem' }}>Coming soon</div>
      <p className="note" style={{ marginTop: 0 }}>
        Solutions for these are still being written. Their analysis guides are complete and open now.
      </p>
      <div className="tags" style={{ marginTop: '.6rem' }}>
        {GUIDES.filter(g => !SOLVED_CODES.includes(g.code)).map(g => (
          <span className="tag" key={g.code}>{g.name}</span>
        ))}
      </div>

      <p className="note" style={{ marginTop: '1.6rem' }}>
        Spotted a step that looks wrong? Say so in the box at the bottom of the solutions page &mdash;
        it gets checked and fixed.
      </p>
    </div>
  );
}

function PyqGuides({ user, go }) {
  return (
    <div className="wrap">
      <h2>PYQ analysis guides</h2>
      <p className="sub">
        Every guide is built from the actual MST papers of that subject &mdash; not guesswork. We counted
        the marks question by question to show which topics keep repeating, how they were asked each
        year, and where students lose easy marks.
      </p>

      {!user && (
        <p className="note" style={{ marginBottom: '1.2rem' }}>
          The Energy &amp; Environment and Manufacturing Processes guides are open to everyone as a sample.
          Sign in with your Thapar email to open the other seven.
        </p>
      )}

      <div className="highlight">
        <span>&#128202;</span>
        <div>
          <b>What's inside every guide</b>
          <p>
            Must-do topics ranked by how often they came up &middot; a repeated-topics heatmap &middot;
            every past question sorted by topic and year &middot; a formula sheet &middot; common
            mistakes &middot; a one-evening plan &middot; and the full past papers.
          </p>
        </div>
      </div>

      <div className="sec-title">Pool A</div>
      <div className="grid">
        {sortGuides(GUIDES.filter(g => g.pool === 'A'), user).map((g, i) => <GuideCard g={g} i={i} user={user} key={g.code} />)}
      </div>

      <SectionFeedback user={user} />

      <div className="sec-title">Pool B</div>
      <div className="grid">
        {sortGuides(GUIDES.filter(g => g.pool === 'B'), user).map((g, i) => <GuideCard g={g} i={i} user={user} key={g.code} />)}
      </div>

      <p className="note" style={{ marginTop: '1.6rem' }}>
        Each guide says which papers it was built from. Syllabus changes every now and then, so
        cross-check the topic list against your own MST syllabus before planning.
      </p>


    </div>
  );
}

function SubjectDetail({ code, user, go }) {
  const [subject, setSubject] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(API + '/api/subjects/' + code)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setSubject)
      .catch(() => setMissing(true));
  }, [code]);

  if (missing) {
    return (
      <div className="wrap">
        <h2>Subject not found</h2>
        <p className="sub">Run the seed script on the backend to load the subject data.</p>
      </div>
    );
  }

  if (!subject) return <div className="wrap"><Spinner /></div>;

  return (
    <div className="wrap">
      <h2>{subject.name}</h2>
      <p className="sub">
        {subject.code} · {subject.credits} credits · L-T-P {subject.ltp} · Pool {subject.pool}
      </p>

      <div className="tags" style={{ marginBottom: '1.8rem' }}>
        <span className="tag">Attendance: {subject.attendance}</span>
        <span className={'tag ' + (subject.detain === 'Low' ? 'ok' : subject.detain === 'High' ? 'warn' : '')}>
          Detention risk: {subject.detain}
        </span>
      </div>

      {GUIDE_CODES.includes(subject.code) && (
        <a
          href={'/guides/' + subject.code + '.html'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackGuideOpen(subject.code, user)}
          style={{
            display: 'flex', alignItems: 'center', gap: '.9rem',
            padding: '1rem 1.2rem', marginBottom: '1.8rem',
            borderRadius: '14px', textDecoration: 'none',
            background: 'linear-gradient(135deg, rgba(108,99,255,.10), rgba(14,110,110,.10))',
            border: '1px solid rgba(108,99,255,.35)', color: '#1A2230'
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>&#128202;</span>
          <span style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: '1rem' }}>PYQ solutions &amp; analysis</b>
            <span style={{ fontSize: '.85rem', color: '#5A6472' }}>
              Papers solved step by step, which topics repeat, formula sheet and the full past papers
            </span>
          </span>
          <span style={{ fontSize: '1.2rem', color: '#5b54d6' }}>&rarr;</span>
        </a>
      )}

      <div className="sec-title">What you will study</div>
      <div className="tags">
        {(subject.topics || []).map(t => <span className="tag" key={t}>{t}</span>)}
      </div>

      <div className="sec-title">How to score well</div>
      {(user || OPEN_CODES.includes(subject.code)) ? (
        <div className="list">
          {(subject.tips || []).map((tip, i) => (
            <div className="card" key={i} style={{ animationDelay: i * 0.06 + 's' }}>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      ) : (
        <LoginGate
          title="Tips are locked"
          text={'Sign in with your Thapar email to read what worked for people who scored well in ' + subject.name + '.'}
        />
      )}
    </div>
  );
}

function Doubts() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '' });
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(API + '/api/doubts')
      .then(r => r.json())
      .then(d => setDoubts(Array.isArray(d) ? d : []))
      .catch(() => setDoubts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!form.title.trim()) {
      setStatus('Add a question before posting.');
      return;
    }
    try {
      const res = await fetch(API + '/api/doubts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setStatus('Posted anonymously. You will get an answer to your question very soon — check the answered doubts below.');
      setForm({ title: '' });
    } catch {
      setStatus('Could not reach the server. Check that the backend is running.');
    }
  };

  const upvote = async id => {
    await fetch(API + '/api/doubts/' + id + '/upvote', { method: 'PATCH' });
    load();
  };

  return (
    <div className="wrap">
      <h2>Anonymous doubts</h2>
      <p className="sub">Nobody sees who asked. Ask the thing you would not ask in class.</p>

      <div className="highlight">
        <span>&#127891;</span>
        <div>
          <b>Built for Thapar, answered by Thapar</b>
          <p>Any doubt at all — subjects, hostel, campus, anything. Ask, and you will get an answer very soon.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h3>Post a doubt</h3>
        <div style={{ marginTop: '1rem' }}>
          <label className="field">
            <input
              placeholder="What do you want to know?"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <button className="btn" onClick={post}>Post anonymously</button>
          {status && <p className="note">{status}</p>}
        </div>
      </div>

      <div className="sec-title">Answered doubts</div>
      {loading ? <Spinner /> : doubts.length === 0 ? (
        <div className="empty">Nothing answered yet. Post the first question.</div>
      ) : (
        <div className="list">
          {doubts.map((d, i) => (
            <div className="card" key={d._id} style={{ animationDelay: i * 0.05 + 's' }}>
              <h4>{d.title}</h4>
              <p><b style={{ color: '#5b54d6' }}>Answer: </b>{d.answer}</p>
              <div className="tags">
                <button className="chip" onClick={() => upvote(d._id)}>Helpful · {d.upvotes || 0}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Admin({ user }) {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [replies, setReplies] = useState({});
  const [denied, setDenied] = useState(false);
  const [mentorApps, setMentorApps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [daily, setDaily] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [opens, setOpens] = useState(null);
  const [hoverHour, setHoverHour] = useState(null);
  const [logins, setLogins] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState([]);
  const [payments, setPayments] = useState(null);
  const [shots, setShots] = useState({});

  const load = useCallback(() => {
    if (!user) return;
    const headers = Auth.adminHeaders(user.email);

    fetch(API + '/api/stats', { headers })
      .then(r => {
        if (r.status === 403) { setDenied(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setStats(d); })
      .catch(() => {});

    fetch(API + '/api/doubts/pending', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setPending(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(API + '/api/doubts')
      .then(r => r.ok ? r.json() : [])
      .then(d => setAnswered(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(API + '/api/mentors/pending', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setMentorApps(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(API + '/api/admin/guide-feedback', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFeedback(d); })
      .catch(() => {});

    fetch(API + '/api/admin/payment-claims', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPayments(d); })
      .catch(() => {});

    fetch(API + '/api/admin/analytics', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAnalytics(d); })
      .catch(() => {});

    fetch(API + '/api/admin/daily?days=90', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDaily(d); })
      .catch(() => {});

    fetch(API + '/api/admin/hourly?days=14', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHourly(d); })
      .catch(() => {});

    fetch(API + '/api/admin/solution-opens', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOpens(d); })
      .catch(() => {});

    fetch(API + '/api/admin/logins', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setLogins(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return <div className="wrap"><LoginGate title="Admin panel" text="Sign in first." /></div>;
  }

  if (denied) {
    return (
      <div className="wrap">
        <h2>No admin access</h2>
        <p className="sub">
          {user.email} is not in the admin list. Add it to ADMIN_EMAILS in backend/.env and restart the server.
        </p>
      </div>
    );
  }

  const sendReply = async id => {
    const answer = replies[id];
    if (!answer || !answer.trim()) return;
    await fetch(API + '/api/doubts/' + id + '/reply', {
      method: 'PATCH',
      headers: Auth.adminHeaders(user.email),
      body: JSON.stringify({ answer })
    });
    setReplies({ ...replies, [id]: '' });
    load();
  };

  const deleteDoubt = async id => {
    if (!window.confirm('Delete this doubt permanently?')) return;
    await fetch(API + '/api/doubts/' + id, {
      method: 'DELETE',
      headers: Auth.adminHeaders(user.email)
    });
    load();
  };

  const decideMentor = async (id, status) => {
    await fetch(API + '/api/mentors/' + id + '/status', {
      method: 'PATCH',
      headers: Auth.adminHeaders(user.email),
      body: JSON.stringify({ status })
    });
    load();
  };

  return (
    <div className="wrap">
      <h2>Admin panel</h2>
      <p className="sub">Signed in as {user.email}</p>

      {stats && (
        <div className="stats">
          <div className="stat"><b>{stats.faqs}</b><span>FAQs</span></div>
          <div className="stat"><b>{stats.subjects}</b><span>Subjects</span></div>
          <div className="stat"><b>{stats.answered}</b><span>Answered</span></div>
          <div className="stat"><b>{stats.pending}</b><span>Pending</span></div>
          <div className="stat"><b>{stats.users}</b><span>Users</span></div>
        </div>
      )}

      <div className="sec-title">Live traffic</div>
      <p className="note" style={{ marginTop: 0 }}>
        A page view is counted once per page load and once each time a guide is opened.
        A device is one browser — the same person on a phone and a laptop counts twice,
        so <b>Users</b> above (one per signed-in Thapar account) is the firmer number.
        Today means since midnight IST.
      </p>
      {analytics && (
        <>
          <div className="stats">
            <div className="stat">
              <b><span className="live" style={{ marginRight: '.4rem' }}></span>{analytics.activeNow}</b>
              <span>Active now</span>
            </div>
            <div className="stat">
              <b>{analytics.visitsCalendarToday != null ? analytics.visitsCalendarToday : analytics.visitsToday}</b>
              <span>Page views today</span>
            </div>
            <div className="stat"><b>{analytics.visitsLast24h || analytics.visitsToday}</b><span>Last 24 hours</span></div>
            <div className="stat"><b>{analytics.uniqueToday != null ? analytics.uniqueToday : '—'}</b><span>Devices today</span></div>
            <div className="stat"><b>{analytics.totalVisits}</b><span>Page views, all time</span></div>
            <div className="stat"><b>{analytics.uniqueVisitors}</b><span>Devices, all time</span></div>
          </div>
          {analytics.topPages.length > 0 && (
            <div className="tags" style={{ marginBottom: '2rem' }}>
              {analytics.topPages.map(p => (
                <span className="tag" key={p.path}>{p.path || 'home'} · {p.count}</span>
              ))}
            </div>
          )}
        </>
      )}

      <div className="sec-title">Guides and solutions, subject by subject</div>
      {!opens || !opens.subjects || opens.subjects.length === 0 ? (
        <div className="empty">Nothing recorded yet.</div>
      ) : (
        <>
          <p className="note" style={{ marginTop: 0 }}>
            How many times each subject&rsquo;s guide was opened, and how many times its solved papers were.
            The last column is what share of guide opens went on to the solutions &mdash; it says which
            subjects people actually finish. All time.
          </p>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ textAlign: 'right' }}>Guide opens</th>
                  <th style={{ textAlign: 'right' }}>Solution opens</th>
                  <th style={{ textAlign: 'right' }}>Devices</th>
                  <th style={{ textAlign: 'right' }}>Went on to solutions</th>
                </tr>
              </thead>
              <tbody>
                {opens.subjects.map(s => (
                  <tr key={s.code}>
                    <td><b>{s.code}</b></td>
                    <td style={{ textAlign: 'right' }}>{s.guideOpens || '—'}</td>
                    <td style={{ textAlign: 'right', color: s.solutionOpens ? '#6c63ff' : undefined }}>
                      <b>{s.solutionOpens || '—'}</b>
                    </td>
                    <td style={{ textAlign: 'right' }}>{s.solutionDevices || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {s.solutionOpens && s.followThrough != null ? s.followThrough + '%' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            <b>{opens.totalSolutionOpens}</b> solution opens in total, against <b>{opens.totalGuideOpens}</b> guide opens.
            A subject with no solutions yet shows a dash.
          </p>
        </>
      )}

      <div className="sec-title">When people are on the site</div>
      {!hourly || !hourly.total ? (
        <div className="empty">Nothing recorded yet.</div>
      ) : (
        <>
          <p className="note" style={{ marginTop: 0 }}>
            Page views by hour of day, added up over the last {hourly.days} days ({hourly.timezone}).
            Each bar is {hourly.days} days of that hour, not one day.
            Busiest is <b>{fmtHour(hourly.busiestHour)}</b> &mdash; {hourly.busiestVisits} views in {hourly.days} days,
            about <b>{Math.round(hourly.busiestVisits / hourly.days)} a day</b>.
            Every bar together comes to {hourly.total} views, roughly{' '}
            {Math.round(hourly.total / hourly.days)} a day.
          </p>

          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '2px',
            height: '160px', marginTop: '1rem', padding: '18px 0 0'
          }}>
            {hourly.hours.map(h => {
              const peak = hourly.busiestVisits || 1;
              const pct = Math.round((h.visits / peak) * 100);
              const isPeak = h.hour === hourly.busiestHour;
              const showing = hoverHour === h.hour || (hoverHour === null && isPeak);
              return (
                <div key={h.hour}
                  onMouseEnter={() => setHoverHour(h.hour)}
                  onMouseLeave={() => setHoverHour(null)}
                  style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                           justifyContent: 'flex-end', position: 'relative', cursor: 'default' }}>
                  {showing && (
                    <span style={{
                      position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)',
                      fontSize: '.72rem', fontWeight: 600, color: '#16202C', whiteSpace: 'nowrap'
                    }}>{h.visits}</span>
                  )}
                  <div style={{
                    height: Math.max(pct, h.visits > 0 ? 2 : 0) + '%',
                    background: '#6c63ff',
                    opacity: hoverHour === null || hoverHour === h.hour ? 1 : .45,
                    borderRadius: '4px 4px 0 0',
                    transition: 'opacity .12s'
                  }} />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '2px', marginTop: '.35rem' }}>
            {hourly.hours.map(h => (
              <div key={h.hour} style={{
                flex: 1, textAlign: 'center', fontSize: '.62rem', color: '#8A94A6',
                fontVariantNumeric: 'tabular-nums'
              }}>{h.hour % 3 === 0 ? String(h.hour).padStart(2, '0') : ''}</div>
            ))}
          </div>
          <p className="note" style={{ marginTop: '.5rem', fontSize: '.78rem' }}>
            Hover a bar for its number. Use this to decide when to post &mdash; a new guide or a
            story lands best an hour before the peak.
          </p>
        </>
      )}

      <div className="sec-title">Day by day record</div>
      {!daily || !daily.days.length ? (
        <div className="empty">Nothing recorded yet.</div>
      ) : (
        <>
          <p className="note" style={{ marginTop: 0 }}>
            Rebuilt from every stored visit, so it covers the days already gone. Times are {daily.timezone}.
            Download it now and again after the exams &mdash; a saved file is proof, a dashboard is not.
          </p>
          <button className="btn btn-sm" style={{ marginBottom: '.8rem' }}
            onClick={() => downloadDailyCsv(daily, hourly)}>
            Download as CSV
          </button>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.86rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e4e4ef' }}>
                  <th style={{ padding: '.45rem .5rem' }}>Date</th>
                  <th style={{ padding: '.45rem .5rem' }}>Visits</th>
                  <th style={{ padding: '.45rem .5rem' }}>Unique</th>
                  <th style={{ padding: '.45rem .5rem' }}>New sign-ins</th>
                  <th style={{ padding: '.45rem .5rem' }}>Most opened</th>
                </tr>
              </thead>
              <tbody>
                {daily.days.map(d => (
                  <tr key={d.date} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '.45rem .5rem', whiteSpace: 'nowrap' }}>{d.date}</td>
                    <td style={{ padding: '.45rem .5rem', fontWeight: 600 }}>{d.visits}</td>
                    <td style={{ padding: '.45rem .5rem' }}>{d.uniqueVisitors}</td>
                    <td style={{ padding: '.45rem .5rem' }}>{d.newSignins}</td>
                    <td style={{ padding: '.45rem .5rem', color: '#5A6472' }}>
                      {d.guides.length ? d.guides.slice(0, 3).map(g => g.path.replace('guide/', '') + ' ' + g.n).join(' · ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="sec-title">Payments</div>
      {!payments || payments.claims.length === 0 ? (
        <div className="empty">No payments yet.</div>
      ) : (
        <>
          <div className="tags" style={{ marginBottom: '.6rem' }}>
            <span className="tag ok">&#8377;{payments.total} collected</span>
            <span className="tag">{payments.activeCount} active unlocks</span>
            <span className="tag">{payments.claims.length} total claims</span>
            <span className="tag">
              {new Set(payments.claims.filter(c => !c.revoked).map(c => c.email)).size} students
            </span>
          </div>
          <div className="tags" style={{ marginBottom: '1rem' }}>
            {SOLUTIONS.map(s => {
              const n = payments.claims.filter(c => !c.revoked && c.code === s.code).length;
              return <span className="tag" key={s.code}>{s.code} · {n} sold</span>;
            })}
          </div>
          <div className="list">
            {payments.claims.map(c => (
              <div className="card" key={c._id} style={c.revoked ? { opacity: .55 } : null}>
                <h4>{c.email}{c.revoked ? ' · revoked' : ''}</h4>
                <div className="tags" style={{ marginTop: '.4rem' }}>
                  <span className="tag">{c.code}</span>
                  <span className="tag ok">&#8377;{c.amount}</span>
                </div>
                <p style={{ marginTop: '.5rem' }}>UTR <b>{c.utr}</b></p>
                <p className="note">{c.name || 'no name'} · {new Date(c.createdAt).toLocaleString()}</p>
                <div className="tags" style={{ marginTop: '.6rem' }}>
                  <button className="btn btn-sm btn-ghost"
                    onClick={() => {
                      if (shots[c._id]) { setShots({ ...shots, [c._id]: null }); return; }
                      fetch(API + '/api/admin/payment-claims/' + c._id + '/screenshot', { headers: Auth.adminHeaders(user.email) })
                        .then(r => r.ok ? r.json() : null)
                        .then(d => setShots({ ...shots, [c._id]: (d && d.screenshot) || 'none' }))
                        .catch(() => {});
                    }}>
                    {shots[c._id] ? 'Hide screenshot' : 'View screenshot'}
                  </button>
                  <button className={'btn btn-sm' + (c.revoked ? ' btn-ghost' : ' btn-red')}
                    onClick={() => {
                      fetch(API + '/api/admin/payment-claims/' + c._id + '/revoke', {
                        method: 'POST',
                        headers: { ...Auth.adminHeaders(user.email), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ revoked: !c.revoked })
                      }).then(() => load()).catch(() => {});
                    }}>
                    {c.revoked ? 'Restore access' : 'Revoke access'}
                  </button>
                </div>
                {shots[c._id] && shots[c._id] !== 'none' && (
                  <img src={shots[c._id]} alt="payment screenshot"
                    style={{ marginTop: '.8rem', maxWidth: '100%', borderRadius: '10px' }} />
                )}
                {shots[c._id] === 'none' && <p className="note">No screenshot was attached.</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sec-title">PYQ guide feedback</div>
      {!feedback || feedback.summary.length === 0 ? (
        <div className="empty">No feedback yet.</div>
      ) : (
        <>
          <div className="list">
            {feedback.summary.map(f => (
              <div className="card" key={f.code}>
                <h4>{f.code === 'SECTION' ? 'PYQ section (overall)' : f.code}</h4>
                <div className="tags" style={{ marginTop: '.5rem' }}>
                  <span className="tag ok">&#128077; {f.up}</span>
                  <span className={'tag' + (f.down ? ' warn' : '')}>&#128078; {f.down}</span>
                  <span className="tag">{Math.round((f.up / (f.up + f.down)) * 100)}% found it helpful</span>
                </div>
              </div>
            ))}
          </div>

          {feedback.comments.length > 0 && (
            <>
              <div className="sec-title">What they wrote</div>
              <div className="list">
                {feedback.comments.map((c, i) => (
                  <div className="card" key={i}>
                    <h4>{c.code === 'SECTION' ? 'PYQ section' : c.code} · {c.helpful ? '👍' : '👎'}</h4>
                    <p style={{ marginTop: '.5rem' }}>{c.comment}</p>
                    <p className="note">{c.email || 'not signed in'} · {new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="sec-title">Logged-in users</div>
      {logins.length === 0 ? (
        <div className="empty">Nobody has signed in yet.</div>
      ) : (
        <div className="list">
          {logins.map(l => (
            <div className="card" key={l.email}>
              <h4>{l.email}</h4>
              <div className="tags" style={{ marginTop: '.6rem' }}>
                {l.active && <span className="tag ok"><span className="live" style={{ marginRight: '.35rem' }}></span>Active now</span>}
                <span className="tag">First seen: {new Date(l.firstSeen).toLocaleString()}</span>
                <span className="tag">Last seen: {new Date(l.lastSeen).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sec-title">Senior applications</div>
      {mentorApps.length === 0 ? (
        <div className="empty">Nothing to review.</div>
      ) : (
        <div className="list">
          {mentorApps.map(m => (
            <div className="card" key={m._id}>
              <h4>{m.name || m.email}</h4>
              <p style={{ marginBottom: '.7rem' }}>
                {m.email} · {m.branch} · {m.year}
              </p>
              <div className="tags" style={{ marginBottom: '.9rem' }}>
                {(m.topics || []).map(t => <span className="tag" key={t}>{t}</span>)}
              </div>
              {m.note && <p style={{ marginBottom: '.9rem' }}>{m.note}</p>}
              <div style={{ display: 'flex', gap: '.6rem' }}>
                <button className="btn btn-sm" onClick={() => decideMentor(m._id, 'verified')}>Verify</button>
                <button className="btn btn-sm btn-ghost" onClick={() => decideMentor(m._id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sec-title">Doubts waiting for a reply</div>
      {pending.length === 0 ? (
        <div className="empty">Queue is empty.</div>
      ) : (
        <div className="list">
          {pending.map(d => (
            <div className="card" key={d._id}>
              <h4>{d.title}</h4>
              {d.description && <p style={{ marginBottom: '.9rem' }}>{d.description}</p>}
              <label className="field">
                <textarea
                  placeholder="Write the answer"
                  value={replies[d._id] || ''}
                  onChange={e => setReplies({ ...replies, [d._id]: e.target.value })}
                />
              </label>
              <div style={{ display: 'flex', gap: '.6rem' }}>
                <button className="btn btn-sm" onClick={() => sendReply(d._id)}>Publish answer</button>
                <button className="btn btn-sm btn-ghost" onClick={() => deleteDoubt(d._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sec-title">Answered doubts</div>
      {answered.length === 0 ? (
        <div className="empty">Nothing answered yet.</div>
      ) : (
        <div className="list">
          {answered.map(d => (
            <div className="card" key={d._id}>
              <h4>{d.title}</h4>
              {d.description && <p style={{ marginBottom: '.7rem' }}>{d.description}</p>}
              <p style={{ marginBottom: '.9rem' }}><b style={{ color: '#5b54d6' }}>Answer: </b>{d.answer}</p>
              <button className="btn btn-sm btn-ghost" onClick={() => deleteDoubt(d._id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- mentorship ---------------- */

const TOPICS = ['Academics', 'Hostel', 'Societies', 'Placements', 'General'];

function ThreadView({ id, user, go }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    fetch(API + '/api/threads/' + id + '?email=' + encodeURIComponent(user.email))
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setMsg('Could not open this conversation.'));
  }, [id, user]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  if (msg) return <div className="wrap"><p className="sub">{msg}</p></div>;
  if (!data) return <div className="wrap"><Spinner /></div>;

  const { thread, role } = data;

  const send = async () => {
    if (!text.trim()) return;
    await fetch(API + '/api/threads/' + id + '/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, text })
    });
    setText('');
    load();
  };

  const resolve = async () => {
    await fetch(API + '/api/threads/' + id + '/resolve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, rating })
    });
    load();
  };

  const publish = async (isPublic) => {
    await fetch(API + '/api/threads/' + id + '/publish', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, isPublic })
    });
    load();
  };

  return (
    <div className="wrap">
      <h2>{thread.topic}</h2>
      <p className="sub">
        {thread.status === 'open' && 'Waiting for a verified senior to pick this up'}
        {thread.status === 'claimed' && <><span className="live">live</span> A verified senior is helping with this</>}
        {thread.status === 'resolved' && 'Closed'}
      </p>

      <div className="chat">
        <div className="bubble bubble-fresher">
          <b>Fresher</b>
          <p>{thread.question}</p>
        </div>
        {thread.messages.map((m, i) => (
          <div key={i} className={'bubble ' + (m.from === 'senior' ? 'bubble-senior' : 'bubble-fresher')}>
            <b>{m.from === 'senior' ? 'Verified Senior' : 'Fresher'}</b>
            <p>{m.text}</p>
          </div>
        ))}
      </div>

      {thread.status === 'claimed' && (role === 'fresher' || role === 'senior') && (
        <div style={{ marginTop: '1.5rem' }}>
          <label className="field">
            <textarea placeholder="Write your reply" value={text} onChange={e => setText(e.target.value)} />
          </label>
          <button className="btn" onClick={send}>Send</button>
        </div>
      )}

      {thread.status === 'claimed' && role === 'fresher' && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h4>Got what you needed?</h4>
          <p style={{ marginBottom: '1rem' }}>Rate how helpful this was, then close the conversation.</p>
          <div className="stars">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={'star' + (rating >= n ? ' on' : '')}
                onClick={() => setRating(n)}
              >&#9733;</button>
            ))}
          </div>
          <button className="btn btn-sm" onClick={resolve} style={{ marginTop: '1rem' }}>
            Mark as resolved
          </button>
        </div>
      )}

      {thread.status === 'resolved' && role === 'fresher' && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h4>Help the next batch</h4>
          <p style={{ marginBottom: '1rem' }}>
            Publish this conversation so other freshers can read it. Your name is never shown.
          </p>
          {thread.isPublic ? (
            <>
              <div className="banner" style={{ marginBottom: '1rem' }}>This conversation is public</div>
              <br />
              <button className="btn btn-sm btn-ghost" onClick={() => publish(false)}>Make it private again</button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={() => publish(true)}>Publish anonymously</button>
          )}
        </div>
      )}
    </div>
  );
}

function ApplySenior({ user, onDone }) {
  const [form, setForm] = useState({ branch: '', year: '3rd year', topics: [], note: '' });
  const [msg, setMsg] = useState('');

  const toggle = t => {
    setForm(f => ({
      ...f,
      topics: f.topics.includes(t) ? f.topics.filter(x => x !== t) : [...f.topics, t]
    }));
  };

  const submit = async () => {
    const res = await fetch(API + '/api/mentors/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: user.email, name: user.name })
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.message); return; }
    onDone();
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h3>Apply as a senior</h3>
      <p style={{ marginBottom: '1.2rem' }}>
        Verified seniors answer questions from first year students. Applications are reviewed manually.
      </p>
      <label className="field">
        <input placeholder="Branch (e.g. CSE)" value={form.branch}
          onChange={e => setForm({ ...form, branch: e.target.value })} />
      </label>
      <label className="field">
        <input placeholder="Year (e.g. 3rd year)" value={form.year}
          onChange={e => setForm({ ...form, year: e.target.value })} />
      </label>
      <p className="sub" style={{ marginBottom: '.7rem' }}>What can you help with?</p>
      <div className="filters">
        {TOPICS.map(t => (
          <button key={t} className={'chip' + (form.topics.includes(t) ? ' on' : '')} onClick={() => toggle(t)}>
            {t}
          </button>
        ))}
      </div>
      <label className="field">
        <textarea placeholder="Anything else we should know (optional)" value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })} />
      </label>
      <button className="btn" onClick={submit}>Submit application</button>
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}

function Guidance({ user, go }) {
  const [mentor, setMentor] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [mine, setMine] = useState([]);
  const [pool, setPool] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [form, setForm] = useState({ topic: '', question: '' });
  const [msg, setMsg] = useState('');
  const [editingTopics, setEditingTopics] = useState(false);
  const [topicDraft, setTopicDraft] = useState([]);
  const [topicMsg, setTopicMsg] = useState('');

  const load = useCallback(() => {
    if (!user) { setLoaded(true); return; }
    const e = encodeURIComponent(user.email);

    fetch(API + '/api/mentors/me?email=' + e)
      .then(r => r.json())
      .then(d => {
        setMentor(d.mentor);
        if (d.mentor && d.mentor.status === 'verified') {
          fetch(API + '/api/threads/pool?email=' + e).then(r => r.ok ? r.json() : []).then(setPool);
          fetch(API + '/api/threads/claimed?email=' + e).then(r => r.json()).then(setClaimed);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    fetch(API + '/api/threads/mine?email=' + e).then(r => r.json()).then(setMine).catch(() => {});
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <div className="wrap">
        <h2>Talk to a senior</h2>
        <p className="sub">
          Ask anything and a verified third year student will guide you, one to one. Both sides stay anonymous.
        </p>
        <LoginGate
          title="Sign in to ask"
          text="You need to sign in so we can notify you by email when a senior replies. Your identity is never shown to them."
        />
      </div>
    );
  }

  if (!loaded) return <div className="wrap"><Spinner /></div>;

  const ask = async () => {
    setMsg('');
    if (!form.topic) { setMsg('Pick a topic first.'); return; }
    if (!form.question.trim()) { setMsg('Write your question first.'); return; }
    const res = await fetch(API + '/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: user.email })
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.message); return; }
    setForm({ topic: '', question: '' });
    setMsg('Sent. A verified senior will answer soon — open the thread below and you can keep chatting with them there.');
    load();
  };

  const claim = async id => {
    const res = await fetch(API + '/api/threads/' + id + '/claim', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.message); return; }
    go('thread', id);
  };

  const isVerified = mentor && mentor.status === 'verified';

  const startEditTopics = () => {
    setTopicDraft(mentor.topics || []);
    setEditingTopics(true);
  };

  const toggleDraftTopic = t => {
    setTopicDraft(d => d.includes(t) ? d.filter(x => x !== t) : [...d, t]);
  };

  const saveTopics = async () => {
    if (topicDraft.length === 0) { setTopicMsg('Pick at least one topic.'); return; }
    const res = await fetch(API + '/api/mentors/me/topics', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, topics: topicDraft })
    });
    const data = await res.json();
    if (!res.ok) { setTopicMsg(data.message); return; }
    setMentor(data);
    setEditingTopics(false);
    setTopicMsg('');
    load();
  };

  return (
    <div className="wrap">
      <h2>Talk to a senior</h2>
      <p className="sub">
        Ask anything and a verified third year student will guide you, one to one. Both sides stay anonymous.
      </p>

      <NotOfficial />

      <div className="highlight">
        <span>&#128172;</span>
        <div>
          <b>Real seniors, not strangers</b>
          <p>Every senior here is manually verified. You will see them as "Verified Senior" and they will never see who you are.</p>
        </div>
      </div>

      {/* ---- verified senior view ---- */}
      {isVerified && (
        <>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h4>Your topics</h4>
            {!editingTopics ? (
              <>
                <div className="tags" style={{ marginTop: '.8rem', marginBottom: '1rem' }}>
                  {(mentor.topics || []).map(t => <span className="tag" key={t}>{t}</span>)}
                </div>
                <button className="btn btn-sm btn-ghost" onClick={startEditTopics}>Edit topics</button>
              </>
            ) : (
              <>
                <p className="sub" style={{ marginTop: '.8rem', marginBottom: '.7rem' }}>Which topics can you help with?</p>
                <div className="filters">
                  {TOPICS.map(t => (
                    <button key={t} className={'chip' + (topicDraft.includes(t) ? ' on' : '')} onClick={() => toggleDraftTopic(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '.6rem', marginTop: '1rem' }}>
                  <button className="btn btn-sm" onClick={saveTopics}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditingTopics(false)}>Cancel</button>
                </div>
              </>
            )}
            {topicMsg && <p className="note">{topicMsg}</p>}
          </div>

          <div className="sec-title">Questions waiting for a senior</div>
          {pool.length === 0 ? (
            <div className="empty">Nothing waiting right now.</div>
          ) : (
            <div className="list">
              {pool.map(t => (
                <div className="card" key={t._id}>
                  <div className="tags" style={{ marginTop: 0, marginBottom: '.7rem' }}>
                    <span className="tag">{t.topic}</span>
                  </div>
                  <p>{t.question}</p>
                  <button className="btn btn-sm" style={{ marginTop: '1rem' }} onClick={() => claim(t._id)}>
                    Claim this
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="sec-title">Threads you are handling</div>
          {claimed.length === 0 ? (
            <div className="empty">You have not claimed anything yet.</div>
          ) : (
            <div className="list">
              {claimed.map(t => (
                <div className="card clickable" key={t._id} onClick={() => go('thread', t._id)}>
                  <div className="tags" style={{ marginTop: 0, marginBottom: '.7rem' }}>
                    <span className="tag">{t.topic}</span>
                    <span className={'tag ' + (t.status === 'resolved' ? 'ok' : '')}>{t.status}</span>
                  </div>
                  <p>{t.question.slice(0, 140)}{t.question.length > 140 ? '...' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---- ask form ---- */}
      <div className="sec-title">Ask a question</div>
      <div className="card">
        <p className="sub" style={{ marginBottom: '.7rem' }}>Pick a topic</p>
        <div className="filters">
          {TOPICS.map(t => (
            <button key={t} className={'chip' + (form.topic === t ? ' on' : '')}
              onClick={() => setForm({ ...form, topic: t })}>{t}</button>
          ))}
        </div>
        <label className="field">
          <textarea
            style={{ minHeight: '150px' }}
            placeholder={'Write it out properly so a senior can actually help. For example: "I am studying Chemistry only from the faculty PPTs but I keep scoring around 12/20 in the quizzes. Should I pick up a reference book as well, or am I revising them wrong?"'}
            value={form.question}
            onChange={e => setForm({ ...form, question: e.target.value })}
          />
        </label>
        <button className="btn" onClick={ask}>Send to a senior</button>
        {msg && <p className="note">{msg}</p>}
      </div>

      {/* ---- my threads ---- */}
      <div className="sec-title">Your questions</div>
      {mine.length === 0 ? (
        <div className="empty">You have not asked anything yet.</div>
      ) : (
        <div className="list">
          {mine.map(t => (
            <div className="card clickable" key={t._id} onClick={() => go('thread', t._id)}>
              <div className="tags" style={{ marginTop: 0, marginBottom: '.7rem' }}>
                <span className="tag">{t.topic}</span>
                <span className={'tag ' + (t.status === 'resolved' ? 'ok' : '')}>
                  {t.status === 'open' ? 'waiting for a senior' : t.status}
                </span>
              </div>
              <p>{t.question.slice(0, 140)}{t.question.length > 140 ? '...' : ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---- become a senior ---- */}
      {!mentor && !showApply && (
        <div className="card" style={{ marginTop: '2.5rem' }}>
          <h4>Are you a third year student?</h4>
          <p style={{ marginBottom: '1rem' }}>Help out the batch below you. Applications are reviewed manually.</p>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowApply(true)}>Apply as a senior</button>
        </div>
      )}
      {!mentor && showApply && <ApplySenior user={user} onDone={load} />}
      {mentor && mentor.status === 'pending' && (
        <div className="banner" style={{ marginTop: '2.5rem' }}>
          Your senior application is under review.
        </div>
      )}
      {mentor && mentor.status === 'rejected' && (
        <div className="empty" style={{ marginTop: '2.5rem' }}>
          Your senior application was not approved.
        </div>
      )}
    </div>
  );
}

function Archive() {
  const [threads, setThreads] = useState([]);
  const [topic, setTopic] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(API + '/api/threads/public/all?topic=' + topic)
      .then(r => r.json())
      .then(d => setThreads(Array.isArray(d) ? d : []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [topic]);

  return (
    <div className="wrap">
      <h2>Answered by seniors</h2>
      <p className="sub">Real conversations, published by the students who asked them.</p>

      <div className="filters">
        <button className={'chip' + (topic === 'all' ? ' on' : '')} onClick={() => setTopic('all')}>All</button>
        {TOPICS.map(t => (
          <button key={t} className={'chip' + (topic === t ? ' on' : '')} onClick={() => setTopic(t)}>{t}</button>
        ))}
      </div>

      {loading ? <Spinner /> : threads.length === 0 ? (
        <div className="empty">Nothing published yet.</div>
      ) : (
        <div className="list">
          {threads.map(t => (
            <div className="card" key={t._id}>
              <div className="tags" style={{ marginTop: 0, marginBottom: '.9rem' }}>
                <span className="tag">{t.topic}</span>
              </div>
              <div className="chat">
                <div className="bubble bubble-fresher"><b>Fresher</b><p>{t.question}</p></div>
                {t.messages.map((m, i) => (
                  <div key={i} className={'bubble ' + (m.from === 'senior' ? 'bubble-senior' : 'bubble-fresher')}>
                    <b>{m.from === 'senior' ? 'Verified Senior' : 'Fresher'}</b>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- root ---------------- */

/* Instagram, Snapchat, Facebook and LinkedIn open links inside their own
   browser, and Google refuses OAuth from there. Tell the visitor to switch. */
function InAppBrowserNotice() {
  const [hide, setHide] = useState(false);
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|Snapchat|LinkedInApp|Line\/|Twitter/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (!inApp || hide) return null;

  function copyLink() {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setHide(true);
      window.alert('Link copied. Open Chrome or Safari and paste it there.');
    } catch (e) {
      window.alert('Copy this link and open it in Chrome or Safari: ' + window.location.origin);
    }
  }

  return (
    <div style={{
      position: 'relative', zIndex: 30, margin: '1rem auto 0', maxWidth: '900px',
      padding: '1rem 1.2rem', borderRadius: '12px',
      background: '#FFF6E5', border: '1px solid #E8C98A', color: '#7A5518', fontSize: '.92rem'
    }}>
      <b>Open this in Chrome{isIOS ? ' or Safari' : ''} to sign in.</b>
      <p style={{ margin: '.45rem 0 0', lineHeight: 1.5 }}>
        You opened this from inside another app, and Google will not let you sign in here.
        Tap the <b>{isIOS ? '\u22ef' : '\u22ee'}</b> menu at the {isIOS ? 'bottom' : 'top'} right and choose
        <b> Open in {isIOS ? 'Safari' : 'Chrome'}</b> \u2014 or copy the link and paste it in your browser.
      </p>
      <div className="tags" style={{ marginTop: '.7rem' }}>
        <button className="btn btn-sm" onClick={copyLink}>Copy link</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setHide(true)}>Dismiss</button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [subjectCode, setSubjectCode] = useState(null);
  const [user, setUser] = useState(Auth.get());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [paid, setPaid] = useState([]);   // subject codes this account has unlocked
  const [history, setHistory] = useState([]);

  // has this account unlocked the solved papers?
  useEffect(() => {
    if (!user) { setPaid([]); return; }
    fetch(API + '/api/access?email=' + encodeURIComponent(user.email))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPaid(d.codes || []); })
      .catch(() => {});
  }, [user]);

  // open a section straight from a shared link, e.g. /#pyq or /#doubts
  useEffect(() => {
    const raw = (window.location.hash || '').replace('#', '');
    const [target, arg] = raw.split('=');
    if (target === 'unlock' && /^[A-Za-z]{3}[0-9]{3}$/.test(arg || '')) {
      setSubjectCode(arg.toUpperCase());
      setPage('unlock');
      return;
    }
    if (['pyq', 'solutions', 'mocks', 'unlock', 'faqs', 'subjects', 'doubts', 'guidance', 'archive'].includes(target)) {
      setPage(target);
    }
  }, []);

  // handle the OAuth redirect: /?email=...&name=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'thapar_only') {
      setLoginError('Please sign in with your @thapar.edu college email — other accounts are not allowed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    const email = params.get('email');
    if (email) {
      const name = params.get('name') || '';
      const adminToken = params.get('adminToken') || '';
      Auth.set(email, name, adminToken);
      setUser({ email, name });
      window.history.replaceState({}, '', window.location.pathname);
      setPage('faqs');
    }
  }, []);

  // page-view tracking + a heartbeat every 30s so the admin panel can show who is active right now
  useEffect(() => {
    const visitorId = getVisitorId();
    const ping = (url) => {
      fetch(API + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, email: user ? user.email : undefined, path: window.location.pathname })
      }).catch(() => {});
    };
    ping('/api/track/visit');
    const timer = setInterval(() => ping('/api/track/heartbeat'), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    fetch(API + '/api/is-admin?email=' + encodeURIComponent(user.email))
      .then(r => r.json())
      .then(d => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user]);

  const go = (target, code) => {
    try {
      const hash = ['pyq', 'solutions', 'mocks', 'unlock', 'faqs', 'subjects', 'doubts', 'guidance', 'archive'].includes(target) ? '#' + target : '';
      window.history.replaceState({}, '', window.location.pathname + hash);
    } catch (e) {}
    setHistory(h => (target === page && (code || null) === subjectCode) ? h : [...h, { page, subjectCode }]);
    setPage(target);
    setSubjectCode(code || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // one back button for the whole site — steps back through the screens you opened
  const back = () => {
    setHistory(h => {
      const prev = h.length ? h[h.length - 1] : { page: 'home', subjectCode: null };
      setPage(prev.page);
      setSubjectCode(prev.subjectCode || null);
      return h.slice(0, -1);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logout = () => {
    Auth.clear();
    setUser(null);
    setHistory([]);
    setPage('home');
    setSubjectCode(null);
  };

  return (
    <>
      <div className="bg">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      <InAppBrowserNotice />

      {loginError && (
        <div
          onClick={() => setLoginError('')}
          style={{
            position: 'relative', zIndex: 20, margin: '1rem auto 0', maxWidth: '900px',
            padding: '.9rem 1.2rem', borderRadius: '12px', cursor: 'pointer',
            background: '#FBEEEE', border: '1px solid #E4B9B9',
            color: '#9B4444', fontSize: '.9rem'
          }}
        >
          {loginError}
        </div>
      )}

      <nav className="nav">
        <button className="brand" onClick={() => go('home')}>
          <h1>FreshStart</h1>
          <span>FIRST YEAR GUIDE</span>
        </button>

        <div className="nav-links">
          <button className={'nav-link' + (page === 'pyq' ? ' on' : '')} onClick={() => go('pyq')}>PYQ Guides</button>
          <button className={'nav-link' + (page === 'solutions' ? ' on' : '')} onClick={() => go('solutions')}>Solved PYQs</button>
          <button className={'nav-link' + (page === 'mocks' ? ' on' : '')} onClick={() => go('mocks')}>Mock papers</button>
          <button className={'nav-link' + (page === 'faqs' ? ' on' : '')} onClick={() => go('faqs')}>FAQs</button>
          <button className={'nav-link' + (page.startsWith('subject') ? ' on' : '')} onClick={() => go('subjects')}>Subjects</button>
          <button className={'nav-link' + (page === 'doubts' ? ' on' : '')} onClick={() => go('doubts')}>Doubts</button>
          <button className={'nav-link' + (page === 'guidance' || page === 'thread' ? ' on' : '')} onClick={() => go('guidance')}>Guidance</button>
          <button className={'nav-link' + (page === 'archive' ? ' on' : '')} onClick={() => go('archive')}>Archive</button>
          {isAdmin && (
            <button className={'nav-link' + (page === 'admin' ? ' on' : '')} onClick={() => go('admin')}>Admin</button>
          )}
          {user ? (
            <>
              <span className="nav-user">{user.name || user.email}</span>
              <button className="btn btn-sm btn-red" onClick={logout}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={startLogin}>Sign in with Thapar email</button>
          )}
        </div>
      </nav>

      {page === 'home' && <Home go={go} />}
      {page !== 'home' && (
        <div className="wrap" style={{ paddingBottom: 0 }}>
          <button className="back" onClick={back}>&larr; Back</button>
        </div>
      )}

      {page === 'pyq' && <PyqGuides user={user} go={go} />}
      {page === 'solutions' && <PyqSolutions user={user} go={go} />}
      {page === 'mocks' && <MockPapers user={user} go={go} paid={paid} />}
      {page === 'unlock' && user && subjectCode && <Unlock user={user} go={go} code={subjectCode} onPaid={c => setPaid(p => [...p, c])} />}
      {page === 'faqs' && <FAQs user={user} />}
      {page === 'subjects' && <Subjects user={user} go={go} />}
      {page === 'subject' && <SubjectDetail code={subjectCode} user={user} go={go} />}
      {page === 'doubts' && <Doubts />}
      {page === 'guidance' && <Guidance user={user} go={go} />}
      {page === 'thread' && <ThreadView id={subjectCode} user={user} go={go} />}
      {page === 'archive' && <Archive />}
      {page === 'admin' && <Admin user={user} />}
    </>
  );
}
