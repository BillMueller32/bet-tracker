-- The number of points a teaser adjusts each leg's line by (e.g. 6, 7, 10).
-- Only meaningful when bet_type = 'teaser'; useful on its own for
-- analysis (e.g. win rate by teaser size) without parsing the description.
alter table bets add column if not exists teaser_points numeric;
