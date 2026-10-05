-- ROCK GAMES CMS. Public storefront policies remain unchanged.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
create policy "Admins read their own authorization" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- The definer can read admin_users without recursive RLS. The caller never gains
-- table write privileges and must still pass every target table's RLS policy.
create function public.is_admin(required_role text default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active
      and (required_role is null or a.role = required_role)
  );
$$;
revoke all on function public.is_admin(text) from public, anon;
grant execute on function public.is_admin(text) to authenticated;

-- An authorized admin needs to see drafts and inactive records in the editor.
grant select on table
  public.platform_families, public.platforms, public.games, public.game_variants,
  public.genres, public.game_genres, public.tags, public.game_tags,
  public.collections, public.collection_items, public.recommendation_moods,
  public.recommendation_mood_tags, public.recommendation_mood_genres,
  public.testimonials, public.site_settings, public.site_sections, public.game_media
to authenticated;

-- Managed CMS tables. Reference catalogs are read only in this phase.
grant insert, update, delete on table
  public.games, public.game_variants, public.game_genres, public.game_tags,
  public.collections, public.collection_items, public.testimonials,
  public.game_media
to authenticated;
grant update on table public.site_settings to authenticated;
grant update on table public.site_sections to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'platform_families', 'platforms', 'games', 'game_variants', 'genres',
    'game_genres', 'tags', 'game_tags', 'collections', 'collection_items',
    'recommendation_moods', 'recommendation_mood_tags',
    'recommendation_mood_genres', 'testimonials', 'site_settings',
    'site_sections', 'game_media'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_admin()))',
      'Admin reads ' || table_name, table_name
    );
  end loop;

  foreach table_name in array array[
    'games', 'game_variants', 'game_genres', 'game_tags', 'collections',
    'collection_items', 'testimonials', 'game_media'
  ] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
      'Admin inserts ' || table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      'Admin updates ' || table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      'Admin deletes ' || table_name, table_name
    );
  end loop;
end;
$$;

create policy "Owner updates site settings" on public.site_settings
  for update to authenticated
  using ((select public.is_admin('owner')) and id = 1)
  with check ((select public.is_admin('owner')) and id = 1);
create policy "Owner updates site sections" on public.site_sections
  for update to authenticated
  using ((select public.is_admin('owner')))
  with check ((select public.is_admin('owner')));

-- Reordering uses one transaction and still obeys the caller's RLS policies.
alter table public.collection_items
  drop constraint collection_items_position_unique;
alter table public.collection_items
  add constraint collection_items_position_unique
  unique (collection_id, position) deferrable initially immediate;

create function public.admin_move_collection_item(
  p_collection_id uuid, p_variant_id uuid, p_direction integer
)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  current_position integer;
  adjacent_position integer;
  adjacent_variant uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if p_direction not in (-1, 1) then
    raise exception 'Invalid direction';
  end if;
  perform 1 from public.collections where id = p_collection_id for update;
  select position into current_position from public.collection_items
    where collection_id = p_collection_id and game_variant_id = p_variant_id;
  if current_position is null then
    raise exception 'Collection item not found';
  end if;
  if p_direction = -1 then
    select game_variant_id, position into adjacent_variant, adjacent_position
    from public.collection_items
    where collection_id = p_collection_id and position < current_position
    order by position desc limit 1;
  else
    select game_variant_id, position into adjacent_variant, adjacent_position
    from public.collection_items
    where collection_id = p_collection_id and position > current_position
    order by position asc limit 1;
  end if;
  if adjacent_variant is null then return; end if;
  set constraints public.collection_items_position_unique deferred;
  update public.collection_items
    set position = case when game_variant_id = p_variant_id
      then adjacent_position else current_position end
    where collection_id = p_collection_id
      and game_variant_id in (p_variant_id, adjacent_variant);
end;
$$;
revoke all on function public.admin_move_collection_item(uuid, uuid, integer) from public, anon;
grant execute on function public.admin_move_collection_item(uuid, uuid, integer) to authenticated;

grant select, insert, delete on table storage.objects to authenticated;
create policy "Admin lists public media" on storage.objects
  for select to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));
create policy "Admin uploads public media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-media' and (select public.is_admin()));
create policy "Admin deletes public media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));
