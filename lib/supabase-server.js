import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

export const BUCKET = 'postcards';
export const ID_PATTERN = /^[23456789a-zA-Z]{10}$/;

// Server-only client. Uses the service role key, which never reaches the browser.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const getCard = cache(async (id) => {
  if (!ID_PATTERN.test(id || '')) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('cards').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(data.photo_path);
  return {
    id: data.id,
    template: data.template,
    bg: data.bg,
    to: data.to_name || '',
    from: data.from_name || '',
    message: data.message,
    colors: data.colors,
    tz: data.tz || undefined,
    sentAt: data.created_at,
    photoURL: pub.publicUrl,
  };
});
