-- Catalog data bootstrap needs authenticated CMS insertion. Keep taxonomy edits
-- and deletion outside this phase; public reads still follow existing RLS.
grant insert on table public.genres, public.tags to authenticated;

create policy "Admin inserts genres" on public.genres
  for insert to authenticated with check ((select public.is_admin()));

create policy "Admin inserts tags" on public.tags
  for insert to authenticated with check ((select public.is_admin()));
