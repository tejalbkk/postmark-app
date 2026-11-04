'use client';
import { useEffect, useRef } from 'react';
import { mount } from '@/lib/card';

// Renders a postcard. Re-mounts when the card's content changes;
// flipping only toggles a class so the 3D turn animates.
export default function CardView({ card, flipped = false, frontOnly = false, id, onClick, className = '' }) {
  const ref = useRef(null);
  const key = JSON.stringify([card.template, card.photoURL, card.ratio, card.to, card.from, card.message, card.sentAt, card.tz, frontOnly]);

  useEffect(() => {
    if (!ref.current) return;
    mount(ref.current, card, { flipped, frontOnly });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    ref.current?.firstElementChild?.classList.toggle('flipped', flipped);
  }, [flipped]);

  return <div className={`card-wrap ${className}`} id={id} ref={ref} onClick={onClick} />;
}
