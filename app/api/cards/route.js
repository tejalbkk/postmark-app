import { NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { supabaseAdmin, BUCKET } from '@/lib/supabase-server';
import { TEMPLATE_IDS, MAX_MESSAGE, clampRatio } from '@/lib/card';

export const runtime = 'nodejs';

const newId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', 10);
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const HEX = /^#[0-9a-f]{6}$/i;

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max) : '');

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return bad('That upload could not be read. Try again.');
  }

  const photo = form.get('photo');
  if (!photo || typeof photo === 'string') return bad('Add a photo before posting.');
  const ext = PHOTO_TYPES[photo.type];
  if (!ext) return bad('The photo must be a JPG, PNG or WebP image.');
  if (photo.size > MAX_PHOTO_BYTES) return bad('That photo is too large. Try a smaller one.');

  let data;
  try {
    data = JSON.parse(form.get('data') || '{}');
  } catch {
    return bad('The card details could not be read. Try again.');
  }

  const template = TEMPLATE_IDS.includes(data.template) ? data.template : null;
  if (!template) return bad('Pick one of the postcard styles.');
  const bg = data.bg === 'wash' ? 'wash' : 'blur';
  const message = clean(data.message, MAX_MESSAGE);
  if (!message) return bad('Write a note on the back before you send it.');
  const to_name = clean(data.to, 24);
  const from_name = clean(data.from, 24);
  const colors = Array.isArray(data.colors) && data.colors.length === 4 && data.colors.every((c) => HEX.test(c))
    ? data.colors
    : ['#2a2340', '#c4607a', '#f29a6b', '#5b4a8a'];
  const ratio = Math.round(clampRatio(data.ratio) * 10000) / 10000;
  let tz = clean(data.tz, 64) || null;
  if (tz) {
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { tz = null; }
  }

  let sb;
  try {
    sb = supabaseAdmin();
  } catch (e) {
    console.error(e);
    return bad('Posting is not set up yet on this server.', 503);
  }

  const id = newId();
  const photo_path = `${id}.${ext}`;
  const bytes = Buffer.from(await photo.arrayBuffer());

  const up = await sb.storage.from(BUCKET).upload(photo_path, bytes, {
    contentType: photo.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (up.error) {
    console.error('photo upload failed', up.error);
    return bad('Your photo could not be saved. Try again in a moment.', 502);
  }

  // Optional small JPEG for chat link previews; posting still works without it.
  const preview = form.get('preview');
  if (preview && typeof preview !== 'string' && preview.type === 'image/jpeg' && preview.size <= 600 * 1024) {
    const pv = await sb.storage.from(BUCKET).upload(`${id}-og.jpg`, Buffer.from(await preview.arrayBuffer()), {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
    if (pv.error) console.error('preview upload failed', pv.error);
  }

  const row = { id, template, bg, to_name, from_name, message, colors, tz, photo_path, ratio };
  let ins = await sb.from('cards').insert(row);
  if (ins.error && /ratio/i.test(ins.error.message || '')) {
    // The ratio column hasn't been added in Supabase yet: save without it (card shows as 3:4).
    console.warn('cards.ratio column missing; run the ALTER TABLE in supabase/schema.sql');
    const { ratio: _r, ...rest } = row;
    ins = await sb.from('cards').insert(rest);
  }
  if (ins.error) {
    console.error('card insert failed', ins.error);
    await sb.storage.from(BUCKET).remove([photo_path, `${id}-og.jpg`]);
    return bad('Your postcard could not be saved. Try again in a moment.', 502);
  }

  return NextResponse.json({ id }, { status: 201 });
}
