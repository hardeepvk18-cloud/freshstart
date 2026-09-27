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
        <li><b>✦</b>PYQ analysis guides for all nine subjects</li>
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
          PYQ analysis guides, subject guides, attendance rules, detention risk and answers from
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
            <h3>PYQ analysis guides for 9 subjects</h3>
            <p>We read every past MST paper of each subject and counted the marks. See which topics repeat, the questions asked each year, a formula sheet, the mistakes that cost marks, and the full papers to practise on.</p>
            <span className="senior-cta-go">Open the guides &rarr;</span>
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
    code: 'UES103',
    file: 'UES103-solutions.html',
    name: 'C Programming',
    pool: 'A',
    papers: 5,
    parts: 30,
    note: 'Five papers solved — every program compiled and run to check its output'
  }
];
const SOLVED_CODES = SOLUTIONS.map(s => s.code);

/* ---- change these two and nothing else to alter the price or the UPI id ---- */
/* Set to true to put the solved papers back behind the paywall.
   The unlock page, the claim form and the admin panel all stay in place. */
const PAID_MODE = false;
const PRICE = 19;
const UPI_QR = "data:image/png;base64,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";
const UPI_ID = '9817176418@ybl';

// one free sample subject per pool — everything else needs a Thapar sign-in
const OPEN_CODES = ['UEN008', 'UES102'];

// the guides that are open without a sign-in come first in their pool
function sortGuides(list, user) {
  if (user) return list;
  return [...list].sort((a, b) => (OPEN_CODES.includes(b.code) ? 1 : 0) - (OPEN_CODES.includes(a.code) ? 1 : 0));
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

function SolutionCard({ s, i, user, paid, go }) {
  const locked = !user || (PAID_MODE && !paid);
  const inner = (
    <>
      <h3>{s.name}{locked ? ' 🔒' : ''}</h3>
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

  if (PAID_MODE && !paid) {
    return (
      <div className="card clickable" onClick={() => go('unlock', s.code)} role="button"
        style={{ animationDelay: i * 0.06 + 's', opacity: .9 }}>
        {inner}
        <p style={noteStyle}>🔓 Tap to unlock — ₹{PRICE} for this paper</p>
      </div>
    );
  }

  return (
    <a className="card clickable"
      href={API + '/api/solutions/' + s.code + '?email=' + encodeURIComponent(user.email)}
      target="_blank" rel="noopener noreferrer"
      onClick={() => trackGuideOpen(s.code + '-SOL', user)}
      style={{ animationDelay: i * 0.06 + 's', textDecoration: 'none', display: 'block' }}>
      {inner}
    </a>
  );
}

/* ---- unlock page: pay by UPI, then enter the transaction id ---- */
function Unlock({ user, go, onPaid, code }) {
  const subject = SOLUTIONS.find(s => s.code === code);
  const [utr, setUtr] = useState('');
  const [shot, setShot] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // shrink the screenshot in the browser so a 3 MB photo does not get uploaded
  function pickFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 520;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        setShot(c.toDataURL('image/jpeg', 0.45));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  }

  async function submit() {
    if (utr.trim().length < 6) { setMsg('Enter the full UPI transaction id (UTR).'); return; }
    setBusy(true); setMsg('');

    // one attempt; withShot=false drops the screenshot, which is what usually
    // makes the request too big for the network in the middle
    async function attempt(withShot) {
      const r = await fetch(API + '/api/payment-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email, name: user.name || '', code,
          utr: utr.trim(), amount: PRICE, screenshot: withShot ? shot : ''
        })
      });
      let d = {};
      try { d = await r.json(); } catch (e) {}
      return { ok: r.ok, d };
    }

    let res = null;
    try {
      res = await attempt(true);
    } catch (e) { res = null; }

    // the screenshot is the only heavy part — retry without it before giving up
    if ((!res || !res.ok) && shot) {
      setMsg('Screenshot bada tha — UTR se try kar raha hoon…');
      try { res = await attempt(false); } catch (e) { res = null; }
    }

    if (res && res.ok) { onPaid(code); go('solutions'); return; }

    setMsg(res && res.d && res.d.message
      ? res.d.message
      : 'Server tak request nahi pahunchi. Thodi der baad dobara try karo — paisa kata hai toh access pakka milega.');
    setBusy(false);
  }

  return (
    <div className="wrap">
      <h2>Unlock {subject ? subject.name : 'these solutions'}</h2>
      <p className="sub">
        ₹{PRICE} opens the solved papers for {subject ? subject.name + ' (' + subject.code + ')' : 'this subject'} —
        {subject ? ' all ' + subject.parts + ' questions from ' + subject.papers + ' past papers, ' : ' '}
        worked out step by step. The analysis guides stay free for everyone.
      </p>

      <div className="sec-title" style={{ marginTop: '1.6rem' }}>Step 1 — pay ₹{PRICE}</div>

      <div className="card" style={{ textAlign: 'center', padding: '1.4rem 1rem' }}>
        <img src={UPI_QR} alt="UPI QR"
          style={{ width: '190px', maxWidth: '64%', borderRadius: '12px' }} />
        <p className="note" style={{ marginTop: '.7rem', marginBottom: '1.1rem' }}>
          Scan with any UPI app and send <b>₹{PRICE}</b>
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
            Open any UPI app, paste this id, send ₹{PRICE}.
          </p>
        </div>
      </div>

      <div className="sec-title" style={{ marginTop: "1.8rem" }}>Step 2 — enter your transaction id</div>
      <p className="note" style={{ marginTop: 0 }}>
        After paying, your UPI app shows a transaction id (UTR) — usually 12 digits. Enter it below and
        the solutions open straight away.
      </p>

      <label className="field" style={{ display: 'block', marginTop: '.9rem' }}>
        <input placeholder="UPI transaction id / UTR" value={utr}
          onChange={e => setUtr(e.target.value)} />
      </label>

      <label className="field" style={{ display: 'block', marginTop: '.7rem' }}>
        <span className="note" style={{ display: 'block', marginBottom: '.4rem' }}>
          Payment screenshot (optional, but it helps if anything goes wrong)
        </span>
        <input type="file" accept="image/*" onChange={pickFile} />
      </label>
      {shot && <p className="note" style={{ color: '#0f766e' }}>Screenshot attached.</p>}

      <button className="btn" style={{ marginTop: '1rem' }} onClick={submit} disabled={busy}>
        {busy ? 'Opening…' : 'Unlock the solutions'}
      </button>
      {msg && <p className="note" style={{ color: '#b91c1c' }}>{msg}</p>}

      <p className="note" style={{ marginTop: '1.6rem' }}>
        Paying with a different account than the one you signed in with is fine — access is tied to
        the Thapar email you are signed in as ({user.email}). Trouble? Ask in Doubts and it gets sorted.
      </p>
    </div>
  );
}

function PyqSolutions({ user, go, paid }) {
  return (
    <div className="wrap">
      <h2>Past PYQ solutions</h2>
      <p className="sub">
        The analysis guides tell you which questions come. These go one step further — every question
        from the past papers worked out fully, the way you would write it in the answer sheet, with the
        method named at each step.
      </p>

      <NotOfficial withErrorNote />

      <div className="highlight" style={{ marginTop: '1.4rem' }}>
        <span>&#9998;</span>
        <div>
          <b>What's inside</b>
          <p>
            Each paper, year by year · every part solved step by step · the method named (reduction of
            order, operator method, convolution, and so on) · the final answer set apart · and a note
            wherever students commonly lose marks.
          </p>
        </div>
      </div>

      <div className="grid" style={{ marginTop: '1.4rem' }}>
        {SOLUTIONS.map((s, i) => <SolutionCard s={s} i={i} user={user} paid={paid.includes(s.code)} go={go} key={s.code} />)}
      </div>

      <div className="sec-title" style={{ marginTop: '2.2rem' }}>Coming soon</div>
      <div className="grid">
        {GUIDES.filter(g => !SOLVED_CODES.includes(g.code)).map((g, i) => (
          <div className="card" key={g.code}
            style={{ animationDelay: i * 0.05 + 's', opacity: .62, cursor: 'default' }}>
            <h3 style={{ fontSize: '1.05rem' }}>{g.name}</h3>
            <p>{g.code} · Pool {g.pool} · {g.papers} papers</p>
            <div className="tags" style={{ marginTop: '.7rem' }}>
              <span className="tag">Solutions coming soon</span>
            </div>
          </div>
        ))}
      </div>

      <p className="note" style={{ marginTop: '1.6rem' }}>
        Subjects are added one at a time, in the order exams come up. Every answer is checked before it
        goes up, but if a step looks wrong, use the feedback box inside the page — it gets fixed for everyone.
      </p>

      <div className="senior-cta" onClick={() => go('pyq')} style={{ marginTop: '1.6rem' }}>
        <div className="senior-cta-in">
          <h3>Haven't seen the analysis guides yet?</h3>
          <p>They show which topics repeat, how often, and what to prepare first — read that before working through the solutions.</p>
          <span className="senior-cta-go">Open the PYQ guides &rarr;</span>
        </div>
      </div>
    </div>
  );
}

function PyqGuides({ user, go }) {
  return (
    <div className="wrap">
      <h2>PYQ analysis guides</h2>
      <p className="sub">
        Every guide is built from the actual MST papers of that subject — not guesswork. We counted the
        marks question by question to show which topics keep repeating, how they were asked each year,
        and where students lose easy marks.
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
            Must-do topics ranked by how often they came up · a repeated-topics heatmap · every past
            question sorted by topic and year · a formula sheet · common mistakes · a
            one-evening plan · and the full past papers.
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

      <div className="senior-cta" onClick={() => go('solutions')} style={{ marginTop: '1.6rem' }}>
        <div className="senior-cta-in">
          <span className="live">new</span>
          <h3>Past papers, fully solved</h3>
          <p>Every question from the past papers worked out step by step, with the method named. Mathematics II is up now, more subjects coming.</p>
          <span className="senior-cta-go">Open the solutions &rarr;</span>
        </div>
      </div>
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
            <b style={{ display: 'block', fontSize: '1rem' }}>PYQ analysis guide</b>
            <span style={{ fontSize: '.85rem', color: '#5A6472' }}>
              Which topics repeat, formula sheet, common mistakes and full past papers
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
      {analytics && (
        <>
          <div className="stats">
            <div className="stat">
              <b><span className="live" style={{ marginRight: '.4rem' }}></span>{analytics.activeNow}</b>
              <span>Active now</span>
            </div>
            <div className="stat"><b>{analytics.visitsToday}</b><span>Visits today</span></div>
            <div className="stat"><b>{analytics.totalVisits}</b><span>Total visits</span></div>
            <div className="stat"><b>{analytics.uniqueVisitors}</b><span>Unique visitors</span></div>
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
    const target = (window.location.hash || '').replace('#', '');
    if (['pyq', 'solutions', 'unlock', 'faqs', 'subjects', 'doubts', 'guidance', 'archive'].includes(target)) {
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
      const hash = ['pyq', 'solutions', 'unlock', 'faqs', 'subjects', 'doubts', 'guidance', 'archive'].includes(target) ? '#' + target : '';
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
      {page === 'solutions' && <PyqSolutions user={user} go={go} paid={paid} />}
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
