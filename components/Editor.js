'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Backdrop from './Backdrop';
import CardView from './CardView';
import Receive from './Receive';
import { TEMPLATES, MAX_MESSAGE } from '@/lib/card';
import { sampleSunset, extractColors } from '@/lib/photo';

const EXAMPLE_MSG =
  'Saw this sunset on my walk home and it looked exactly like that evening at the beach with you. Wish you were here to see it. Miss you heaps!';
const STEPS = ['Photo', 'Design', 'Write', 'Send'];
const NEXT_LABEL = ['Use this photo', 'Write the back', 'Ready to send'];
const DRAFT_KEY = 'postmark-draft';

function canvasToBlob(canvas) {
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86));
}

export default function Editor() {
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [template, setTemplate] = useState('classic');
  const [bg, setBg] = useState('blur');
  const [to, setTo] = useState('Maya');
  const [from, setFrom] = useState('Priya');
  const [message, setMessage] = useState(EXAMPLE_MSG);
  const [photo, setPhoto] = useState({ url: '', blob: null, isSample: true });
  const [colors, setColors] = useState(['#2a2340', '#c4607a', '#f29a6b', '#5b4a8a']);
  const [preview, setPreview] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(null); // { url }
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [canShare, setCanShare] = useState(false);
  const [sentAt] = useState(() => new Date().toISOString());
  const loaded = useRef(false);
  const toastTimer = useRef(null);

  const toast = useCallback((t) => {
    setToastMsg(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const applyPhotoCanvas = useCallback(async (canvas, isSample) => {
    setColors(extractColors(canvas));
    const blob = await canvasToBlob(canvas);
    setPhoto((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return { url: URL.createObjectURL(blob), blob, isSample };
    });
  }, []);

  // first load: draft, reply link, sample photo
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (saved) {
        if (TEMPLATES.some((t) => t.id === saved.template)) setTemplate(saved.template);
        if (saved.bg === 'wash' || saved.bg === 'blur') setBg(saved.bg);
        if (typeof saved.to === 'string') setTo(saved.to);
        if (typeof saved.from === 'string') setFrom(saved.from);
        if (typeof saved.message === 'string') setMessage(saved.message);
      }
    } catch (e) {}
    const replyTo = new URLSearchParams(window.location.search).get('to');
    if (replyTo) {
      setTo(replyTo.slice(0, 24));
      setMessage('');
    }
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
    applyPhotoCanvas(sampleSunset(), true);
    loaded.current = true;
  }, [applyPhotoCanvas]);

  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ template, bg, to, from, message })); } catch (e) {}
  }, [template, bg, to, from, message]);

  // any change after posting means the link no longer matches the card
  useEffect(() => { setPosted(null); setError(''); }, [template, bg, to, from, message, photo.url]);

  useEffect(() => { setFlipped(step === 2); }, [step]);

  const card = useMemo(() => ({
    template, bg, to, from, message, colors, photoURL: photo.url, sentAt,
    tz: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
  }), [template, bg, to, from, message, colors, photo.url, sentAt]);

  function loadFile(file) {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) { toast("That file isn't a photo. Pick a JPG, PNG or HEIC image."); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      applyPhotoCanvas(c, false);
      toast('Photo added. Now pick a look.');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't read that photo. Try another one."); };
    img.src = url;
  }

  const go = (n) => {
    setStep(Math.max(0, Math.min(3, n)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function post() {
    if (!photo.blob || posting) return;
    if (!message.trim()) { setError('Write a note on the back before you send it.'); go(2); return; }
    setPosting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', photo.blob, 'photo.jpg');
      fd.append('data', JSON.stringify({ template, bg, to, from, message, colors, tz: card.tz }));
      const res = await fetch('/api/cards', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong while posting. Try again.');
      setPosted({ url: `${window.location.origin}/p/${json.id}` });
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    } catch (e) {
      setError(e.message || 'Something went wrong while posting. Try again.');
    } finally {
      setPosting(false);
    }
  }

  const shareText = `${from.trim() || 'Someone'} sent you a postcard 💌`;
  async function nativeShare() {
    try { await navigator.share({ title: 'A postcard for you', text: shareText, url: posted.url }); }
    catch (e) { /* closed the share sheet */ }
  }
  async function copyLink(msg = 'Link copied.') {
    try { await navigator.clipboard.writeText(posted.url); toast(msg); }
    catch (e) { toast('Copy failed. Press and hold the link to copy it.'); }
  }

  function startOver() {
    setPosted(null);
    setMessage('');
    setStep(0);
    applyPhotoCanvas(sampleSunset(), true);
  }

  const wa = posted && `https://wa.me/?text=${encodeURIComponent(`${shareText} ${posted.url}`)}`;
  const sms = posted && `sms:?&body=${encodeURIComponent(`${shareText} ${posted.url}`)}`;
  const mail = posted && `mailto:?subject=${encodeURIComponent('A postcard for you')}&body=${encodeURIComponent(`${shareText}\n\n${posted.url}`)}`;

  return (
    <>
      <Backdrop photoURL={photo.url} colors={colors} mode={bg} />
      <div className="app">
        <header>
          <div className="brand">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#f7efd9" d="M5 4h22v24H5z" /><rect x="9" y="8" width="14" height="13" fill="#f2b07a" /><circle cx="20" cy="12" r="2.4" fill="#fff6e0" /><path d="M9 21l5-6 4 4 2-2 3 4z" fill="#8c4a5c" /></svg>
            Postmark
          </div>
          <nav className="steps" aria-label="Steps">
            {STEPS.map((s, i) => (
              <button key={s} type="button" aria-current={step === i ? 'step' : undefined} onClick={() => go(i)}>
                <b>{i + 1}</b><span>{s}</span>
              </button>
            ))}
          </nav>
        </header>

        <section className="stage">
          {photo.url && <CardView card={card} flipped={flipped} id="editCard" onClick={() => setFlipped((f) => !f)} />}
          <div className="stage-meta">
            {photo.isSample && <span className="chip">Sample photo</span>}
            <button className="flipbtn" type="button" onClick={() => setFlipped((f) => !f)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" /></svg>
              <span>{flipped ? 'Flip to front' : 'Flip to back'}</span>
            </button>
          </div>
        </section>

        <section className="sheet">
          {step === 0 && (
            <div className="panel">
              <h2>Catch the moment</h2>
              <p>Take a photo of whatever made you think of them. It becomes the front of the card, and its colours become the background.</p>
              <div className="btn-row">
                <label className="btn primary" htmlFor="camInput">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                  Take a photo
                </label>
                <label className="btn" htmlFor="libInput">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 16l5-5 4 4 3-3 6 6" /></svg>
                  Choose from library
                </label>
              </div>
              <input className="sr" type="file" id="camInput" accept="image/*" capture="environment" onChange={(e) => { loadFile(e.target.files[0]); e.target.value = ''; }} />
              <input className="sr" type="file" id="libInput" accept="image/*" onChange={(e) => { loadFile(e.target.files[0]); e.target.value = ''; }} />
              <p className="note">{photo.isSample ? "You're seeing a sample sunset until you add your own photo." : 'Looking good. Retake it or pick another any time.'}</p>
            </div>
          )}

          {step === 1 && (
            <div className="panel">
              <h2>Make it yours</h2>
              <div className="field">
                <div className="tiles-head"><span className="label">Style</span><small>{TEMPLATES.length} styles · swipe for more</small></div>
                <div className="tiles">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} type="button" className="tile" aria-pressed={template === t.id} onClick={() => setTemplate(t.id)}>
                      {photo.url && <CardView card={{ ...card, template: t.id }} frontOnly />}
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Background</span>
                <div className="seg">
                  <button type="button" aria-pressed={bg === 'blur'} onClick={() => setBg('blur')}>Blurred photo</button>
                  <button type="button" aria-pressed={bg === 'wash'} onClick={() => setBg('wash')}>Colour wash</button>
                </div>
                <div className="swatches">
                  {colors.map((c, i) => <i key={i} style={{ background: c }} />)}
                  <small>Pulled from your photo</small>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="panel">
              <h2>Write on the back</h2>
              <div className="field-row">
                <div className="field"><label className="label" htmlFor="toInput">To</label><input id="toInput" maxLength={24} autoComplete="off" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="fromInput">From</label><input id="fromInput" maxLength={24} autoComplete="off" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              </div>
              <div className="field">
                <label className="label" htmlFor="msgInput">Your note</label>
                <textarea id="msgInput" maxLength={MAX_MESSAGE} value={message} placeholder="What made you think of them?" onChange={(e) => setMessage(e.target.value)} />
                <div className="hint-row">
                  <span>{message === EXAMPLE_MSG ? 'Example note. Replace it with yours.' : ''}</span>
                  <span>{message.length}/{MAX_MESSAGE}</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="panel">
              <h2>{posted ? 'Posted. Now send it' : 'Ready to post'}</h2>
              {!posted && (
                <>
                  <p>Posting saves your card and gives you a link. They tap it and it opens in their browser. No app needed.</p>
                  <div className="bubble-wrap">
                    <div className="bubble">
                      {photo.url && <CardView card={card} frontOnly />}
                      <div className="meta"><strong>{(from.trim() || 'Someone') + ' sent you a postcard'}</strong><small>Tap to open it</small></div>
                    </div>
                  </div>
                  <button className="btn primary" type="button" onClick={post} disabled={posting}>
                    {posting ? 'Posting…' : 'Post my postcard'}
                  </button>
                  <button className="btn" type="button" onClick={() => setPreview(true)}>Preview it as your friend</button>
                </>
              )}
              {posted && (
                <div className="posted">
                  <div className="linkbox"><code>{posted.url}</code><button type="button" onClick={() => copyLink()}>Copy</button></div>
                  {canShare && <button className="btn primary" type="button" onClick={nativeShare}>Share…</button>}
                  <div className="share">
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z" /></svg>WhatsApp
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); if (canShare) nativeShare(); else copyLink('Link copied. Paste it in an Instagram DM.'); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r=".6" fill="currentColor" /></svg>Instagram
                    </a>
                    <a href={sms}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16v10H9l-5 4z" /></svg>Messages
                    </a>
                    <a href={mail}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>Email
                    </a>
                  </div>
                  <div className="btn-row">
                    <a className="btn" href={posted.url} target="_blank" rel="noopener noreferrer">Open it</a>
                    <button className="btn" type="button" onClick={startOver}>Make another</button>
                  </div>
                </div>
              )}
              {error && <p className="error" role="alert">{error}</p>}
            </div>
          )}

          <div className="nav">
            <button className="btn" type="button" onClick={() => go(step - 1)} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>Back</button>
            <span className="spacer" />
            {step < 3 && <button className="btn primary" type="button" onClick={() => go(step + 1)}>{NEXT_LABEL[step]}</button>}
          </div>
        </section>
      </div>

      {preview && (
        <Receive card={card} mode="preview" onClose={() => setPreview(false)} onReply={() => { setPreview(false); go(0); }} />
      )}
      <div className={`toast ${toastMsg ? 'show' : ''}`} role="status" aria-live="polite">{toastMsg}</div>
    </>
  );
}
