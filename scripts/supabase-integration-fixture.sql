-- Temporary integration fixture for the linked project. Remove with the paired cleanup file.
-- This is deliberately excluded from supabase/migrations and supabase/seed.sql.
begin;

insert into public.genres (slug, name, sort_order)
values ('rg-integration-check', 'Integración (PRUEBA)', 999);

insert into public.tags (slug, name)
values ('rg-integration-check', 'Prueba interna');

insert into public.games (slug, title, short_description, description, is_published)
values (
  'rg-integration-check', 'Prueba interna · NO VENDER',
  'Ficha temporal para validar la integración.',
  'Se retirará al terminar las pruebas.', true
);

insert into public.game_genres (game_id, genre_id, is_primary, sort_order)
select game.id, genre.id, true, 1
from public.games game, public.genres genre
where game.slug = 'rg-integration-check' and genre.slug = 'rg-integration-check';

insert into public.game_tags (game_id, tag_id)
select game.id, tag.id
from public.games game, public.tags tag
where game.slug = 'rg-integration-check' and tag.slug = 'rg-integration-check';

insert into public.game_variants (
  game_id, platform_id, version_key, version_label, price, compare_at_price, availability
)
select game.id, platform.id, 'standard', 'Edición de prueba', variant.price,
  variant.compare_at_price, 'available'::public.availability_status
from (values ('ps5', 10.00, 15.00), ('xbox-series-xs', 20.00, null::numeric))
  as variant(platform_slug, price, compare_at_price)
join public.games game on game.slug = 'rg-integration-check'
join public.platforms platform on platform.slug = variant.platform_slug;

insert into public.game_media (game_id, bucket, storage_path, role, sort_order)
select id, 'local-assets', '/assets/featured-elden-v1.webp', 'cover', 1
from public.games where slug = 'rg-integration-check';

insert into public.collection_items (collection_id, game_variant_id, position)
select collection.id, variant.id, 1
from (values ('featured', 'ps5'), ('best-sellers', 'xbox-series-xs'), ('featured-offers', 'ps5'))
  as item(collection_slug, platform_slug)
join public.collections collection on collection.slug = item.collection_slug
join public.platforms platform on platform.slug = item.platform_slug
join public.games game on game.slug = 'rg-integration-check'
join public.game_variants variant on variant.game_id = game.id and variant.platform_id = platform.id;

insert into public.recommendation_moods (slug, label, sort_order)
values ('rg-integration-check', 'Prueba interna', 999);

insert into public.recommendation_mood_tags (mood_id, tag_id)
select mood.id, tag.id
from public.recommendation_moods mood, public.tags tag
where mood.slug = 'rg-integration-check' and tag.slug = 'rg-integration-check';

commit;
