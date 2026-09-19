# Bet Tracker

A personal sports bet tracker: log bets manually, see live status pulled
from public sports-data APIs, and track results in one place across
phone and laptop.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- [Supabase](https://supabase.com) — database + auth (magic link, no passwords)
- Deployed on [Vercel](https://vercel.com)

## Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# from your Supabase project's Settings > API page
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

The schema lives in `supabase/migrations/0001_init.sql`. Run it in your
Supabase project's SQL Editor to create the `bets` table.

## Deploying

Import this repo into Vercel and set the same two environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the
Vercel project settings.
