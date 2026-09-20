-- Sportsbook the bet was placed with — free text (not an enum) so a new
-- book doesn't need a schema change, at the cost of grouping being
-- sensitive to how it's typed.
alter table bets add column if not exists sportsbook text;

alter table bets add column if not exists is_free_bet boolean not null default false;

alter table bets add column if not exists cash_out_amount numeric(10, 2);

-- When set, this is the bet's realized profit/loss in dollars, overriding
-- the normal odds x stake computation entirely. Covers any case where the
-- book didn't pay out exactly what the recorded odds/stake imply: a
-- cash-out, a boosted price, or a parlay settled manually after a pushed
-- leg (which reduces the payout in a way the original combined odds no
-- longer reflect). Left null for the common case, where profit keeps
-- being derived from odds/stake/status as before.
alter table bets add column if not exists actual_profit numeric(10, 2);

-- Bankroll/unit size are account-level, not per-bet, so they live on
-- their own row rather than as bet columns.
create table if not exists user_settings (
  user_id uuid primary key references auth.users (id) default auth.uid(),
  bankroll numeric(10, 2),
  unit_size numeric(10, 2)
);

alter table user_settings enable row level security;

create policy "Users manage their own settings"
  on user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
