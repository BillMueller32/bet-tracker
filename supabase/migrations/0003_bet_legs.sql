-- Teasers (and parlays with detailed legs) bundle several picks into one
-- wager with a single stake/payout. Each pick lives in bet_legs so it can
-- eventually get its own live score/status; the parent bets row still
-- holds the overall stake/odds/status.
alter table bets drop constraint if exists bets_bet_type_check;
alter table bets add constraint bets_bet_type_check check (
  bet_type in (
    'moneyline', 'spread', 'total',
    'player_prop', 'team_prop',
    'outright', 'match', 'parlay', 'teaser', 'other'
  )
);

create table if not exists bet_legs (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets (id) on delete cascade,
  leg_order integer not null default 0,

  sport text not null,
  event_name text not null,
  event_start timestamptz,
  external_event_id text,

  participant text,
  selection text not null,
  line numeric,
  odds integer
);

alter table bet_legs enable row level security;

create policy "Users manage legs of their own bets"
  on bet_legs
  for all
  using (
    exists (
      select 1 from bets
      where bets.id = bet_legs.bet_id and bets.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from bets
      where bets.id = bet_legs.bet_id and bets.user_id = auth.uid()
    )
  );

create index if not exists bet_legs_bet_id_idx on bet_legs (bet_id, leg_order);
