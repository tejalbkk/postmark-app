import { ImageResponse } from 'next/og';
import { getCard } from '@/lib/supabase-server';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A postcard';

// Fetch the photo ourselves so a slow or missing image falls back to a plain card instead of failing.
async function loadPhoto(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/image\/(jpeg|png)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// The thumbnail chat apps show: the photo as a postcard with a stamp, on its own colours.
export default async function Image({ params }) {
  const { id } = await params;
  const card = await getCard(id).catch(() => null);
  const c = card?.colors || ['#2a2340', '#c4607a', '#f29a6b', '#5b4a8a'];
  const photo = card ? await loadPhoto(card.photoURL) : null;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${c[2]} 0%, ${c[1]} 45%, ${c[0]} 100%)` }}>
        <div style={{ position: 'relative', display: 'flex', padding: 16, background: '#f8f0da', transform: 'rotate(-3deg)', boxShadow: '0 30px 70px rgba(0,0,0,.35)', borderRadius: 6 }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={780} height={520} style={{ objectFit: 'cover', borderRadius: 3 }} alt="" />
          ) : (
            <div style={{ width: 780, height: 520, background: c[3] }} />
          )}
          <div style={{ position: 'absolute', top: 44, right: 44, width: 132, height: 132, borderRadius: 66, border: '6px solid rgba(255,250,240,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(10deg)' }}>
            <div style={{ width: 100, height: 100, borderRadius: 50, border: '3px solid rgba(255,250,240,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="46" height="46" viewBox="0 0 24 24"><path fill="rgba(255,250,240,.95)" d="M12 21s-7.5-4.7-7.5-10.5A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9C19.5 16.3 12 21 12 21z" /></svg>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
