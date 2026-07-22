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
        <span className={'tag ' + (subject.detain === 'Low' ? 'ok' : subject.detain === 'High' ? 'warn' : '')}>
          Detention risk: {subject.detain}
        </span>
      </div>

      <div className="sec-title">What you will study</div>
      <div className="tags">
        {(subject.topics || []).map(t => <span className="tag" key={t}>{t}</span>)}
      </div>

      <div className="sec-title">How to score well</div>
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
              <p><b style={{ color: '#8d86ff' }}>Answer: </b>{d.answer}</p>
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

    fetch(API + '/api/mentors/pending', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setMentorApps(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(API + '/api/admin/analytics', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAnalytics(d); })
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

  if (msg) return <div className="wrap"><button className="back" onClick={() => go('guidance')}>Back</button><p className="sub">{msg}</p></div>;
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
      <button className="back" onClick={() => go('guidance')}>Back to guidance</button>
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

  return (
    <div className="wrap">
      <h2>Talk to a senior</h2>
      <p className="sub">
        Ask anything and a verified third year student will guide you, one to one. Both sides stay anonymous.
      </p>

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
            <button className="btn btn-sm" onClick={startLogin}>Sign in</button>
          )}
        </div>
      </nav>

      {page === 'home' && <Home go={go} />}
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
