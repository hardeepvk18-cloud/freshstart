import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

/* Crush Radar — mutual-only. You name up to 3 crushes by Instagram handle.
   A match shows ONLY when both of you named each other. Nobody is ever told
   about a one-sided crush, and someone who never signs up is never contacted. */
export default function Crush({ user, go }) {
  const [self, setSelf] = useState('');
  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [c3, setC3] = useState('');
  const [matched, setMatched] = useState([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    fetch(API + '/api/crush/status?email=' + encodeURIComponent(user.email))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.entry) {
          setSelf(d.entry.selfInsta || '');
          const cr = d.entry.crushes || [];
          setC1(cr[0] || ''); setC2(cr[1] || ''); setC3(cr[2] || '');
          setSaved(true);
        }
        if (d) setMatched(d.matched || []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  const submit = async () => {
    setMsg(''); setBusy(true);
    try {
      const r = await fetch(API + '/api/crush/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, selfInsta: self, crushes: [c1, c2, c3] })
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d.message || 'Something went wrong.'); setBusy(false); return; }
      setSaved(true);
      setMatched(d.matched || []);
      setSelf(d.selfInsta);
      setMsg(d.matched && d.matched.length ? '' : 'Saved. We’ll keep it secret until it’s mutual.');
    } catch (e) {
      setMsg('Network error. Try again.');
    }
    setBusy(false);
  };

  const removeEntry = async () => {
    setBusy(true); setMsg('');
    try {
      await fetch(API + '/api/crush/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      setSelf(''); setC1(''); setC2(''); setC3(''); setMatched([]); setSaved(false);
      setMsg('Removed. You’re no longer in Crush Radar.');
    } catch (e) { setMsg('Could not remove. Try again.'); }
    setBusy(false);
  };

  return (
    <div className="cr-wrap">
      <style>{`
        .cr-wrap{max-width:560px;margin:0 auto;padding:1.5rem 1rem 4rem}
        .cr-hero{text-align:center;margin-bottom:1.5rem}
        .cr-hero h1{font-size:2rem;margin:.2rem 0}
        .cr-hero p{color:#667;max-width:460px;margin:.4rem auto 0;line-height:1.5}
        .cr-card{background:#fff;border:1px solid #e6e6ef;border-radius:16px;padding:1.4rem;box-shadow:0 2px 14px rgba(30,20,60,.05)}
        .cr-lbl{display:block;font-weight:600;font-size:.9rem;margin:.9rem 0 .3rem;color:#333}
        .cr-in{display:flex;align-items:center;border:1px solid #d7d7e3;border-radius:10px;padding:.1rem .6rem;background:#fafaff}
        .cr-in span{color:#999;font-size:.95rem}
        .cr-in input{border:0;outline:0;background:transparent;padding:.6rem .3rem;font-size:1rem;width:100%}
        .cr-btn{width:100%;margin-top:1.2rem;border:0;border-radius:10px;padding:.8rem;font-size:1rem;font-weight:600;color:#fff;background:linear-gradient(90deg,#ff5f8f,#ff7a59);cursor:pointer}
        .cr-btn:disabled{opacity:.6;cursor:default}
        .cr-note{font-size:.82rem;color:#778;line-height:1.5;margin-top:1rem}
        .cr-msg{margin-top:.8rem;font-size:.9rem;color:#555;text-align:center}
        .cr-match{background:linear-gradient(135deg,#fff0f4,#fff6f0);border:1px solid #ffd4df;border-radius:14px;padding:1.1rem;margin-bottom:1.2rem;text-align:center}
        .cr-match h2{margin:.2rem 0;color:#e03a6d}
        .cr-match a{display:inline-block;margin:.3rem .3rem 0;font-weight:700;color:#e03a6d;text-decoration:none;border:1px solid #ffc2d2;border-radius:999px;padding:.35rem .8rem}
        .cr-ghost{background:none;border:0;color:#a44;font-size:.82rem;margin-top:1rem;cursor:pointer;text-decoration:underline}
        .cr-how{margin-top:1.4rem;font-size:.85rem;color:#667;line-height:1.6}
        .cr-how b{color:#445}
      `}</style>

      <div className="cr-hero">
        <h1>Crush Radar 💘</h1>
        <p>Name your crush by their Instagram. If they name you back, you both find out. If they don&apos;t, nobody ever knows — not even them.</p>
      </div>

      {!user && (
        <div className="cr-card" style={{ textAlign: 'center' }}>
          <p>Sign in with your college email to use Crush Radar.</p>
          <button className="cr-btn" onClick={() => go('home')}>Go to sign in</button>
        </div>
      )}

      {user && loaded && (
        <div className="cr-card">
          {matched.length > 0 && (
            <div className="cr-match">
              <h2>It&apos;s a match! 🎉</h2>
              <p style={{ margin: '.2rem 0', color: '#a1476a' }}>You both named each other:</p>
              {matched.map(h => (
                <a key={h} href={'https://instagram.com/' + h} target="_blank" rel="noreferrer">@{h}</a>
              ))}
            </div>
          )}

          <label className="cr-lbl">Your Instagram</label>
          <div className="cr-in"><span>@</span>
            <input value={self} onChange={e => setSelf(e.target.value)} placeholder="your_handle" autoCapitalize="none" />
          </div>

          <label className="cr-lbl">Your crush&apos;s Instagram (up to 3)</label>
          <div className="cr-in"><span>@</span>
            <input value={c1} onChange={e => setC1(e.target.value)} placeholder="crush_one" autoCapitalize="none" />
          </div>
          <div className="cr-in" style={{ marginTop: '.5rem' }}><span>@</span>
            <input value={c2} onChange={e => setC2(e.target.value)} placeholder="crush_two (optional)" autoCapitalize="none" />
          </div>
          <div className="cr-in" style={{ marginTop: '.5rem' }}><span>@</span>
            <input value={c3} onChange={e => setC3(e.target.value)} placeholder="crush_three (optional)" autoCapitalize="none" />
          </div>

          <button className="cr-btn" disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : saved ? 'Update my crushes' : 'Find my match'}
          </button>

          {msg && <div className="cr-msg">{msg}</div>}

          {saved && (
            <div style={{ textAlign: 'center' }}>
              <button className="cr-ghost" disabled={busy} onClick={removeEntry}>Remove me from Crush Radar</button>
            </div>
          )}

          <div className="cr-how">
            <b>How it stays safe:</b><br />
            • A match shows only when both of you have named each other.<br />
            • A one-sided crush is never shown to anyone — not even a hint.<br />
            • Someone who hasn&apos;t joined is never messaged or notified.<br />
            • One Instagram handle can belong to only one account.
          </div>
        </div>
      )}
    </div>
  );
}
