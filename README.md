# Bet Tracker

A personal sports bet tracker: log bets manually or from a screenshot, see
live status pulled from public sports-data APIs, and track results in one
place across phone and laptop.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- [Supabase](https://supabase.com) — database, storage, and auth (GitHub sign-in)
- [Claude API](https://console.anthropic.com) — reads bet details out of bet slip screenshots
- Deployed on [Vercel](https://vercel.com)

## Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase
# project's Settings > API page) and ANTHROPIC_API_KEY (console.anthropic.com)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Migrations live in `supabase/migrations/`. Run them in order in your
Supabase project's SQL Editor:

- `0001_init.sql` — creates the `bets` table
- `0002_screenshots.sql` — adds screenshot storage for the "add from
  screenshot" flow

## Deploying

Import this repo into Vercel and set the same environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`ANTHROPIC_API_KEY`) in the Vercel project settings.

Sign-in uses GitHub OAuth — configured as a provider in Supabase's
Authentication settings, pointing at a GitHub OAuth App.
