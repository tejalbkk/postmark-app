# Postmark

Turn a photo into a postcard and send it to a friend on WhatsApp, Instagram, Messages or email.
They tap the link, the card drops in, a stamp thumps down, and they flip it to read your note.

Built with Next.js (hosted on Vercel) and Supabase (stores each card's photo and note).

## How it works

| Piece | Where |
| --- | --- |
| Editor: photo → style → note → send | `app/page.js`, `components/Editor.js` |
| Postcard styles (9) | `lib/card.js`, styles in `app/globals.css` |
| Opening experience (stamp, flip, note) | `components/Receive.js`, `app/p/[id]/page.js` |
| Chat link preview image | `app/p/[id]/opengraph-image.js` |
| Saving a card | `app/api/cards/route.js` → Supabase table `cards` + bucket `postcards` |

The browser never talks to Supabase directly. Only the server holds the secret key,
and the `cards` table has Row Level Security on with no public policies.

## 1. Set up Supabase (about 5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste everything from `supabase/schema.sql`, and click **Run**.
   This creates the `cards` table and a public `postcards` photo bucket.
3. Open **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY` (keep this private)

## 2. Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev
```

Open http://localhost:3000. To try it on your phone, use your computer's network address
(shown in the terminal) while both are on the same Wi‑Fi.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. In [vercel.com](https://vercel.com) choose **Add New → Project** and import the repo.
3. Under **Environment Variables** add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = your Vercel address, e.g. `https://postmark-yourname.vercel.app`
4. Click **Deploy**. Every push to `main` redeploys automatically.

After the first deploy, paste a card link into WhatsApp to check the preview image shows.
WhatsApp caches previews, so a link you shared before a fix may keep its old preview.

## Adding a style

1. Add `{ id, name }` to `TEMPLATES` in `lib/card.js`.
2. Add a `case` for it in both `front()` and `back()`.
3. Optional: give it a cut-out outline in `SHAPES` (drawn in a 300×200 box).
4. Style it with `.t-<id>` rules in `app/globals.css`. Sizes use `cqw` so cards scale anywhere.

## Good next steps

- Rate limiting on `POST /api/cards` (for example with Vercel's firewall or Upstash) before sharing widely.
- A way for senders to delete a card they've sent.
- "Add to Home Screen" support (web app manifest) so it opens like an app.
