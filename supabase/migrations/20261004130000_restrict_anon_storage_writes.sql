-- Public media can be downloaded by URL. Anonymous clients must not mutate
-- objects even when the Storage API returns an empty result for RLS-filtered rows.
-- Authenticated privileges remain available for a future CMS with explicit RLS.
revoke insert, update, delete, truncate, references, trigger
  on table storage.objects from anon;
