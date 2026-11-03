'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Backdrop from './Backdrop';
import { mount, lastWordCount } from '@/lib/card';

// The opening experience: card drops in, stamp thumps, postmark inks,
// then the friend taps to flip and the note writes itself in.
export default function Receive({ card, mode = 'page', onClose, onReply }) {
  const cardRef = useRef(null);
  const wrapRef = useRef(null);
  const timers = useRef([]);
  const [run, setRun] = useState(0);
  const [hint, setHint] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [words, setWords] = useState(0);

  const later = (fn, ms) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timers.current.push(setTimeout(fn, reduced ? 0 : ms));
  };

  useEffect(() => {
    const host = cardRef.current;
    if (!host) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const el = mount(host, card, { flipped: false });
    setWords(lastWordCount());
    el.classList.add('await-stamp', 'await-ink', 'writing');
    setHint('');
    setShowActions(false);
    wrapRef.current?.classList.remove('nudge');
    // restart the entrance animations on replay
    document.querySelectorAll('.r-from,.r-cardwrap,.receive .backdrop').forEach((n) => {
      n.style.animation = 'none';
      void n.offsetWidth;
      n.style.animation = '';
    });
    later(() => { el.classList.remove('await-stamp'); el.classList.add('stamped'); }, 1700);
    later(() => { host.classList.remove('bump'); void host.offsetWidth; host.classList.add('bump'); }, 1960);
    later(() => { el.classList.remove('await-ink'); el.classList.add('inked'); }, 2250);
    later(() => { setHint('Tap the card to flip it'); wrapRef.current?.classList.add('nudge'); }, 3000);
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, card]);

  useEffect(() => {
    if (mode !== 'preview') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [mode, onClose]);

  const flip = useCallback(() => {
    const el = cardRef.current?.firstElementChild;
    if (!el || el.classList.contains('await-stamp')) return;
    wrapRef.current?.classList.remove('nudge');
    const toBack = !el.classList.contains('flipped');
    el.classList.toggle('flipped', toBack);
    setHint(toBack ? 'Tap again to see the photo' : 'Tap the card to flip it');
    if (toBack && !el.classList.contains('written')) {
      later(() => el.classList.add('written'), 450);
      later(() => setShowActions(true), 1400 + words * 55);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const from = (card.from || '').trim() || 'a friend';
  const replyHref = `/?to=${encodeURIComponent((card.from || '').trim())}`;

  return (
    <div className="receive" role={mode === 'preview' ? 'dialog' : undefined} aria-label="Postcard">
      <Backdrop photoURL={card.photoURL} colors={card.colors} mode={card.bg} />
      {mode === 'preview' && (
        <button className="r-close" type="button" onClick={onClose}>Close preview</button>
      )}
      <div className="r-inner">
        <p className="r-from">A postcard from <b>{from}</b></p>
        <div
          className="r-cardwrap"
          ref={wrapRef}
          role="button"
          tabIndex={0}
          aria-label="Postcard. Tap to flip."
          onClick={flip}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } }}
        >
          <div className="card-wrap" ref={cardRef} />
        </div>
        <p className={`r-hint ${hint ? 'show' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5" /></svg>
          <span>{hint || 'Tap the card to flip it'}</span>
        </p>
        <div className="r-actions" hidden={!showActions}>
          <button className="btn" type="button" onClick={() => setRun((n) => n + 1)}>Play again</button>
          {mode === 'preview'
            ? <button className="btn primary" type="button" onClick={onReply}>Send one back</button>
            : <a className="btn primary" href={replyHref}>Send one back</a>}
        </div>
        {mode === 'page' && <p className="r-foot">Made with <a href="/">Postmark</a>. Turn your own photo into a postcard.</p>}
      </div>
    </div>
  );
}
