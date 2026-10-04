-- Remove only rows created by supabase-integration-fixture.sql.
begin;
delete from public.games where slug = 'rg-integration-check';
delete from public.recommendation_moods where slug = 'rg-integration-check';
delete from public.genres where slug = 'rg-integration-check';
delete from public.tags where slug = 'rg-integration-check';
commit;
