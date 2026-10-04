-- ROCK GAMES catalog foundation. Public reads only; admin writes are intentionally absent.

create type public.availability_status as enum (
  'upcoming', 'preorder', 'available', 'unavailable'
);
create type public.collection_type as enum ('placement', 'campaign');
create type public.media_role as enum ('cover', 'hero', 'gallery', 'poster', 'video');
create type public.recommendation_sort as enum ('editorial', 'price_asc', 'newest');

create table public.platform_families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_families_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.platform_families(id) on delete restrict,
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platforms_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint platforms_family_name_unique unique (family_id, name)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null default '',
  description text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.game_variants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete restrict,
  version_key text not null default 'standard',
  version_label text,
  price numeric(10, 2) not null,
  compare_at_price numeric(10, 2),
  availability public.availability_status not null default 'available',
  release_date date,
  new_until timestamptz,
  stock_quantity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_variants_version_key_check check (length(trim(version_key)) > 0),
  constraint game_variants_price_nonnegative check (price >= 0),
  constraint game_variants_compare_price_nonnegative check (compare_at_price is null or compare_at_price >= 0),
  constraint game_variants_stock_nonnegative check (stock_quantity is null or stock_quantity >= 0),
  constraint game_variants_game_platform_version_unique unique (game_id, platform_id, version_key),
  constraint game_variants_id_game_unique unique (id, game_id)
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  constraint genres_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.game_genres (
  game_id uuid not null references public.games(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete restrict,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  primary key (game_id, genre_id)
);

create unique index game_genres_one_primary_per_game
  on public.game_genres (game_id) where is_primary;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  constraint tags_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.game_tags (
  game_id uuid not null references public.games(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  primary key (game_id, tag_id)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type public.collection_type not null default 'placement',
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint collections_window_check check (start_at is null or end_at is null or end_at > start_at)
);

create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  game_variant_id uuid not null references public.game_variants(id) on delete cascade,
  position integer not null,
  primary key (collection_id, game_variant_id),
  constraint collection_items_position_positive check (position > 0),
  constraint collection_items_position_unique unique (collection_id, position)
);

create table public.recommendation_moods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  platform_family_id uuid references public.platform_families(id) on delete restrict,
  max_price numeric(10, 2),
  sort_mode public.recommendation_sort not null default 'editorial',
  max_results integer not null default 3,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recommendation_moods_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint recommendation_moods_price_nonnegative check (max_price is null or max_price >= 0),
  constraint recommendation_moods_max_results_positive check (max_results > 0)
);

create table public.recommendation_mood_tags (
  mood_id uuid not null references public.recommendation_moods(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (mood_id, tag_id)
);

create table public.recommendation_mood_genres (
  mood_id uuid not null references public.recommendation_moods(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (mood_id, genre_id)
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  text text not null,
  platform_family_id uuid references public.platform_families(id) on delete set null,
  source text,
  date date,
  rating smallint,
  consented_at timestamptz,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint testimonials_rating_check check (rating is null or rating between 1 and 5),
  constraint testimonials_published_requires_consent check (not published or consented_at is not null)
);

create table public.site_settings (
  id smallint primary key default 1,
  brand_name text not null default 'ROCK GAMES',
  country char(2) not null default 'MX',
  currency char(3) not null default 'MXN',
  logo_path text,
  whatsapp_number text,
  facebook_url text,
  youtube_url text,
  email text,
  analytics_id text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton_check check (id = 1)
);

create table public.site_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  eyebrow text,
  title text,
  highlighted_text text,
  description text,
  media_path text,
  poster_path text,
  media_alt text,
  cta_label text,
  cta_url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint site_sections_key_check check (key in (
    'hero', 'platforms', 'featured', 'best_sellers', 'offers', 'upcoming',
    'how_it_works', 'trust', 'testimonials', 'final_cta'
  ))
);

create table public.game_media (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_variant_id uuid,
  bucket text not null,
  storage_path text not null,
  role public.media_role not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint game_media_bucket_check check (length(trim(bucket)) > 0),
  constraint game_media_storage_path_check check (length(trim(storage_path)) > 0),
  constraint game_media_bucket_path_unique unique (bucket, storage_path),
  constraint game_media_variant_belongs_to_game_fk
    foreign key (game_variant_id, game_id)
    references public.game_variants (id, game_id) on delete cascade
);

create index platforms_family_id_idx on public.platforms (family_id);
create index games_published_idx on public.games (is_published) where is_published;
create index game_variants_game_id_idx on public.game_variants (game_id);
create index game_variants_platform_id_idx on public.game_variants (platform_id);
create index game_variants_catalog_idx on public.game_variants (platform_id, is_active, availability);
create index game_variants_release_date_idx on public.game_variants (release_date) where release_date is not null;
create index game_genres_genre_id_idx on public.game_genres (genre_id);
create index game_tags_tag_id_idx on public.game_tags (tag_id);
create index collection_items_variant_idx on public.collection_items (game_variant_id);
create index collections_visible_window_idx on public.collections (is_active, start_at, end_at) where is_active;
create index recommendation_moods_active_order_idx on public.recommendation_moods (is_active, sort_order) where is_active;
create index recommendation_mood_tags_tag_id_idx on public.recommendation_mood_tags (tag_id);
create index recommendation_mood_genres_genre_id_idx on public.recommendation_mood_genres (genre_id);
create index testimonials_public_order_idx on public.testimonials (sort_order) where published and consented_at is not null;
create index site_sections_visible_order_idx on public.site_sections (is_visible, sort_order) where is_visible;
create index game_media_game_role_idx on public.game_media (game_id, role, sort_order);
create index game_media_variant_id_idx on public.game_media (game_variant_id) where game_variant_id is not null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger platform_families_set_updated_at before update on public.platform_families
  for each row execute function public.set_updated_at();
create trigger platforms_set_updated_at before update on public.platforms
  for each row execute function public.set_updated_at();
create trigger games_set_updated_at before update on public.games
  for each row execute function public.set_updated_at();
create trigger game_variants_set_updated_at before update on public.game_variants
  for each row execute function public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
  for each row execute function public.set_updated_at();
create trigger recommendation_moods_set_updated_at before update on public.recommendation_moods
  for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger site_sections_set_updated_at before update on public.site_sections
  for each row execute function public.set_updated_at();

alter table public.platform_families enable row level security;
alter table public.platforms enable row level security;
alter table public.games enable row level security;
alter table public.game_variants enable row level security;
alter table public.genres enable row level security;
alter table public.game_genres enable row level security;
alter table public.tags enable row level security;
alter table public.game_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.recommendation_moods enable row level security;
alter table public.recommendation_mood_tags enable row level security;
alter table public.recommendation_mood_genres enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_sections enable row level security;
alter table public.game_media enable row level security;

create policy "Public reads active platform families" on public.platform_families
  for select to anon using (is_active);
create policy "Public reads active platforms in active families" on public.platforms
  for select to anon using (
    is_active and exists (
      select 1 from public.platform_families f
      where f.id = family_id and f.is_active
    )
  );
create policy "Public reads published games" on public.games
  for select to anon using (is_published);
create policy "Public reads active variants of published games" on public.game_variants
  for select to anon using (
    is_active
    and exists (select 1 from public.games g where g.id = game_id and g.is_published)
    and exists (
      select 1 from public.platforms p
      join public.platform_families f on f.id = p.family_id
      where p.id = platform_id and p.is_active and f.is_active
    )
  );
create policy "Public reads active genres" on public.genres
  for select to anon using (is_active);
create policy "Public reads genres for published games" on public.game_genres
  for select to anon using (
    exists (select 1 from public.games g where g.id = game_id and g.is_published)
    and exists (select 1 from public.genres ge where ge.id = genre_id and ge.is_active)
  );
create policy "Public reads active tags" on public.tags
  for select to anon using (is_active);
create policy "Public reads tags for published games" on public.game_tags
  for select to anon using (
    exists (select 1 from public.games g where g.id = game_id and g.is_published)
    and exists (select 1 from public.tags t where t.id = tag_id and t.is_active)
  );
create policy "Public reads current active collections" on public.collections
  for select to anon using (
    is_active and (start_at is null or start_at <= now()) and (end_at is null or end_at > now())
  );
create policy "Public reads collection items with published variants" on public.collection_items
  for select to anon using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.is_active
        and (c.start_at is null or c.start_at <= now())
        and (c.end_at is null or c.end_at > now())
    )
    and exists (
      select 1 from public.game_variants v
      join public.games g on g.id = v.game_id
      join public.platforms p on p.id = v.platform_id
      join public.platform_families f on f.id = p.family_id
      where v.id = game_variant_id and v.is_active and g.is_published and p.is_active and f.is_active
    )
  );
create policy "Public reads active recommendation moods" on public.recommendation_moods
  for select to anon using (is_active);
create policy "Public reads tags for active recommendation moods" on public.recommendation_mood_tags
  for select to anon using (
    exists (select 1 from public.recommendation_moods m where m.id = mood_id and m.is_active)
    and exists (select 1 from public.tags t where t.id = tag_id and t.is_active)
  );
create policy "Public reads genres for active recommendation moods" on public.recommendation_mood_genres
  for select to anon using (
    exists (select 1 from public.recommendation_moods m where m.id = mood_id and m.is_active)
    and exists (select 1 from public.genres g where g.id = genre_id and g.is_active)
  );
create policy "Public reads testimonials with consent" on public.testimonials
  for select to anon using (published and consented_at is not null);
create policy "Public reads the single site settings row" on public.site_settings
  for select to anon using (id = 1);
create policy "Public reads visible site sections" on public.site_sections
  for select to anon using (is_visible);
create policy "Public reads media for published content" on public.game_media
  for select to anon using (
    exists (select 1 from public.games g where g.id = game_id and g.is_published)
    and (
      game_variant_id is null
      or exists (
        select 1 from public.game_variants v
        where v.id = game_variant_id and v.game_id = game_media.game_id and v.is_active
      )
    )
  );

-- Revoke table access as well as writes. RLS policies alone do not remove grants.
revoke all on table
  public.platform_families, public.platforms, public.games, public.game_variants,
  public.genres, public.game_genres, public.tags, public.game_tags,
  public.collections, public.collection_items, public.recommendation_moods,
  public.recommendation_mood_tags, public.recommendation_mood_genres,
  public.testimonials, public.site_settings, public.site_sections, public.game_media
from PUBLIC, anon, authenticated;
grant select on table
  public.platform_families, public.platforms, public.games, public.game_variants,
  public.genres, public.game_genres, public.tags, public.game_tags,
  public.collections, public.collection_items, public.recommendation_moods,
  public.recommendation_mood_tags, public.recommendation_mood_genres,
  public.testimonials, public.site_settings, public.site_sections, public.game_media
to anon;

-- A public bucket serves files by URL. This does not create upload or delete policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media', 'public-media', true, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'video/mp4']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.site_settings is 'Public storefront settings only; never store keys or credentials here.';
comment on table public.game_media is 'Media references only. Store objects in Supabase Storage, not PostgreSQL byte columns.';
