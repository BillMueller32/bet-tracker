-- Bets table: one row per bet you place with your bookie.
-- Sport-aware: works for team matchups (moneyline/spread/total/props)
-- and individual formats like golf (outright/top-N) and tennis (match).
create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  placed_at timestamptz not null default now(),

  sport text not null check (
    sport in (
      'nfl', 'nba', 'mlb', 'nhl',
      'ncaaf', 'ncaab',
      'golf', 'tennis',
      'soccer', 'other'
    )
  ),

  -- Human-readable event, e.g. "Chiefs @ Bills", "The Open Championship",
  -- "Alcaraz vs Sinner". external_event_id links to the sports-data API
  -- event/game id so live score polling knows what to fetch.
  event_name text not null,
  event_start timestamptz,
  external_event_id text,

  bet_type text not null check (
    bet_type in (
      'moneyline', 'spread', 'total',
      'player_prop', 'team_prop',
      'outright', 'match', 'parlay', 'other'
    )
  ),

  -- For props/outrights: who the bet is about (player or team name).
  participant text,
  -- What you're actually betting on, e.g. "Bills -3.5", "Over 48.5",
  -- "Mahomes Over 275.5 passing yards", "Scheffler top 5".
  selection text not null,
  line numeric,
  odds integer not null,
  stake numeric(10, 2) not null,

  status text not null default 'pending' check (
    status in ('pending', 'live', 'won', 'lost', 'push', 'cancelled')
  ),
  result_value text,
  settled_at timestamptz,

  notes text
);

alter table bets enable row level security;

create policy "Users manage their own bets"
  on bets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists bets_user_status_idx on bets (user_id, status);
create index if not exists bets_user_event_start_idx on bets (user_id, event_start);
