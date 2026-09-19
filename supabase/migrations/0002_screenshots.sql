-- Lets a bet reference the screenshot it was created from.
alter table bets add column if not exists screenshot_path text;

-- Private bucket; files are stored under "<user_id>/<filename>".
insert into storage.buckets (id, name, public)
values ('bet-screenshots', 'bet-screenshots', false)
on conflict (id) do nothing;

create policy "Users manage their own bet screenshots"
  on storage.objects
  for all
  using (
    bucket_id = 'bet-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'bet-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
