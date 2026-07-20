import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  set(email, name) {
    localStorage.setItem('fs_email', email);
    localStorage.setItem('fs_name', name || '');
  },
  clear() {
    localStorage.removeItem('fs_email');
    localStorage.removeItem('fs_name');
  }
};

const startLogin = () => { window.location.href = API + '/auth/google'; };

/* ---------------- shared pieces ---------------- */

function LoginGate({ title, text }) {
  return (
    <div className="gate">
      <span className="lock">🔒</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <ul className="perks">
        <li><b>✦</b>Every FAQ, fully unlocked</li>
        <li><b>✦</b>Pool B subject guides</li>
        <li><b>✦</b>Topper tips for all ten subjects</li>
        <li><b>✦</b>The full answered doubts archive</li>
      </ul>
      <br />
      <button className="btn btn-lg" onClick={startLogin}>Sign in with Google</button>
    </div>
  );
}

const Spinner = () => <div className="spinner" />;

/* ---------------- pages ---------------- */

function Home({ go }) {
  return (
    <div className="hero">
      <div className="hero-in">
        <h2 className="hero-title">Start first year <em>knowing what to expect</em></h2>
        <p>
          Subject guides, attendance rules, detention risk and answers from people who
          already survived it. Built for TIET first year students.
        </p>

        <div className="mini-grid">
          <div className="mini" onClick={() => go('subjects')}><i>📚</i><h4>Subjects</h4><p>Pool A and B</p></div>
          <div className="mini" onClick={() => go('faqs')}><i>❓</i><h4>FAQs</h4><p>Real answers</p></div>
          <div className="mini" onClick={() => go('doubts')}><i>💬</i><h4>Doubts</h4><p>Ask anonymously</p></div>
          <div className="mini" onClick={() => go('subjects')}><i>💡</i><h4>Tips</h4><p>What toppers do</p></div>
        </div>

        <div className="hero-btns">
          <button className="btn btn-lg" onClick={() => go('faqs')}>Browse the guide</button>
          <button className="btn btn-lg btn-ghost" onClick={startLogin}>Sign in</button>
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

      {!user && <div className="banner">Free preview. Sign in to see the full set.</div>}

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
          text="Sign in with your Google account to open the rest of the questions. It takes about ten seconds."
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

  const locked = pool === 'B' && !user;

  return (
    <div className="wrap">
      <h2>Subject guide</h2>
      <p className="sub">
        Your pool is not fixed by branch in the first semester. Roughly half the batch gets
        Pool A and half gets Pool B, and the order flips in semester two.
      </p>

      <div className="filters">
        <button className={'chip' + (pool === 'A' ? ' on' : '')} onClick={() => setPool('A')}>Pool A</button>
        <button className={'chip' + (pool === 'B' ? ' on' : '')} onClick={() => setPool('B')}>
          Pool B{user ? '' : ' 🔒'}
        </button>
      </div>

      {locked ? (
        <LoginGate
          title="Pool B is locked"
          text="Sign in to open the Pool B subject guides and the topper tips for every subject."
        />
      ) : loading ? <Spinner /> : (
        <div className="grid">
          {subjects.map((s, i) => (
            <div
              className="card clickable"
              key={s._id}
              style={{ animationDelay: i * 0.06 + 's' }}
              onClick={() => go('subject', s.code)}
            >
              <h3>{s.name}</h3>
              <p>{s.code} · {s.credits} credits · L-T-P {s.ltp}</p>
              <div className="tags">
                <span className="tag">Attendance: {s.attendance}</span>
                <span className={'tag ' + (s.detain === 'No' ? 'ok' : 'warn')}>
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
        <button className="back" onClick={() => go('subjects')}>Back to subjects</button>
        <h2>Subject not found</h2>
        <p className="sub">Run the seed script on the backend to load the subject data.</p>
      </div>
    );
  }

  if (!subject) return <div className="wrap"><Spinner /></div>;

  return (
    <div className="wrap">
      <button className="back" onClick={() => go('subjects')}>Back to subjects</button>
      <h2>{subject.name}</h2>
      <p className="sub">
        {subject.code} · {subject.credits} credits · L-T-P {subject.ltp} · Pool {subject.pool}
      </p>

      <div className="tags" style={{ marginBottom: '1.8rem' }}>
        <span className="tag">Attendance: {subject.attendance}</span>
        <span className={'tag ' + (subject.detain === 'No' ? 'ok' : 'warn')}>
          Detention risk: {subject.detain}
        </span>
      </div>

      <div className="sec-title">What you will study</div>
      <div className="tags">
        {(subject.topics || []).map(t => <span className="tag" key={t}>{t}</span>)}
      </div>

      <div className="sec-title">How to actually pass it</div>
      {(user || subject.pool === 'A') ? (
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
          text={'Sign in to read what worked for people who scored well in ' + subject.name + '.'}
        />
      )}
    </div>
  );
}

function Doubts() {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', subject: 'General' });
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
      setForm({ title: '', description: '', subject: 'General' });
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
          <label className="field">
            <input
              placeholder="Subject (optional)"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
            />
          </label>
          <label className="field">
            <textarea
              placeholder="Add any detail that would help someone answer properly"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
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
              {d.description && <p style={{ marginBottom: '.7rem' }}>{d.description}</p>}
              <p><b style={{ color: '#8d86ff' }}>Answer: </b>{d.answer}</p>
              <div className="tags">
                <span className="tag">{d.subject}</span>
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

  const load = useCallback(() => {
    if (!user) return;
    const headers = { 'Content-Type': 'application/json', 'x-user-email': user.email };

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
      headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
      body: JSON.stringify({ answer })
    });
    setReplies({ ...replies, [id]: '' });
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
              <button className="btn btn-sm" onClick={() => sendReply(d._id)}>Publish answer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- root ---------------- */

export default function App() {
  const [page, setPage] = useState('home');
  const [subjectCode, setSubjectCode] = useState(null);
  const [user, setUser] = useState(Auth.get());
  const [isAdmin, setIsAdmin] = useState(false);

  // handle the OAuth redirect: /?email=...&name=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      const name = params.get('name') || '';
      Auth.set(email, name);
      setUser({ email, name });
      window.history.replaceState({}, '', window.location.pathname);
      setPage('faqs');
    }
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    fetch(API + '/api/is-admin?email=' + encodeURIComponent(user.email))
      .then(r => r.json())
      .then(d => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user]);

  const go = (target, code) => {
    setPage(target);
    setSubjectCode(code || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logout = () => {
    Auth.clear();
    setUser(null);
    go('home');
  };

  return (
    <>
      <div className="bg">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      <nav className="nav">
        <button className="brand" onClick={() => go('home')}>
          <h1>FreshStart</h1>
          <span>FIRST YEAR GUIDE</span>
        </button>

        <div className="nav-links">
          <button className={'nav-link' + (page === 'faqs' ? ' on' : '')} onClick={() => go('faqs')}>FAQs</button>
          <button className={'nav-link' + (page.startsWith('subject') ? ' on' : '')} onClick={() => go('subjects')}>Subjects</button>
          <button className={'nav-link' + (page === 'doubts' ? ' on' : '')} onClick={() => go('doubts')}>Doubts</button>
          {isAdmin && (
            <button className={'nav-link' + (page === 'admin' ? ' on' : '')} onClick={() => go('admin')}>Admin</button>
          )}
          {user ? (
            <>
              <span className="nav-user">{user.name || user.email}</span>
              <button className="btn btn-sm btn-red" onClick={logout}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={startLogin}>Sign in</button>
          )}
        </div>
      </nav>

      {page === 'home' && <Home go={go} />}
      {page === 'faqs' && <FAQs user={user} />}
      {page === 'subjects' && <Subjects user={user} go={go} />}
      {page === 'subject' && <SubjectDetail code={subjectCode} user={user} go={go} />}
      {page === 'doubts' && <Doubts />}
      {page === 'admin' && <Admin user={user} />}
    </>
  );
}
