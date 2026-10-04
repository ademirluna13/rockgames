-- Local-development sample data only. All product names end in (DEMO).
-- Prices and media are illustrative and must not be treated as an offer or stock.

insert into public.platform_families (slug, name, sort_order, is_active)
values
  ('playstation', 'PlayStation', 1, true),
  ('xbox', 'Xbox', 2, true),
  ('nintendo', 'Nintendo', 3, true)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.platforms (family_id, slug, name, sort_order, is_active)
select f.id, p.slug, p.name, p.sort_order, true
from (values
  ('playstation', 'ps4', 'PlayStation 4', 1),
  ('playstation', 'ps5', 'PlayStation 5', 2),
  ('xbox', 'xbox-one', 'Xbox One', 1),
  ('xbox', 'xbox-series-xs', 'Xbox Series X|S', 2),
  ('nintendo', 'nintendo-switch', 'Nintendo Switch', 1),
  ('nintendo', 'nintendo-switch-2', 'Nintendo Switch 2', 2)
) as p(family_slug, slug, name, sort_order)
join public.platform_families f on f.slug = p.family_slug
on conflict (slug) do update set
  family_id = excluded.family_id, name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.genres (slug, name, sort_order, is_active)
values ('adventure', 'Aventura', 1, true), ('racing', 'Carreras', 2, true), ('action', 'Acción', 3, true)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.tags (slug, name, is_active)
values
  ('narrative', 'Narrativa', true),
  ('open-world', 'Mundo abierto', true),
  ('racing', 'Carreras', true),
  ('multiplayer', 'Multijugador', true),
  ('upcoming-demo', 'Lanzamiento de demostración', true)
on conflict (slug) do update set name = excluded.name, is_active = excluded.is_active;

insert into public.games (slug, title, short_description, description, is_published)
values
  ('guardian-del-bosque-demo', 'Guardián del bosque (DEMO)', 'Aventura de ejemplo para desarrollo.', 'Contenido de demostración. No representa un producto, precio ni disponibilidad real.', true),
  ('circuito-neon-demo', 'Circuito neón (DEMO)', 'Carreras de ejemplo para desarrollo.', 'Contenido de demostración. No representa un producto, precio ni disponibilidad real.', true),
  ('expedicion-futura-demo', 'Expedición futura (DEMO)', 'Ficha de lanzamiento de ejemplo.', 'Contenido de demostración. No representa un producto, precio ni disponibilidad real.', true)
on conflict (slug) do update set
  title = excluded.title, short_description = excluded.short_description,
  description = excluded.description, is_published = excluded.is_published;

insert into public.game_genres (game_id, genre_id, is_primary, sort_order)
select g.id, ge.id, mapping.is_primary, mapping.sort_order
from (values
  ('guardian-del-bosque-demo', 'adventure', true, 1),
  ('circuito-neon-demo', 'racing', true, 1),
  ('expedicion-futura-demo', 'adventure', true, 1),
  ('expedicion-futura-demo', 'action', false, 2)
) as mapping(game_slug, genre_slug, is_primary, sort_order)
join public.games g on g.slug = mapping.game_slug
join public.genres ge on ge.slug = mapping.genre_slug
on conflict (game_id, genre_id) do update set is_primary = excluded.is_primary, sort_order = excluded.sort_order;

insert into public.game_tags (game_id, tag_id)
select g.id, t.id
from (values
  ('guardian-del-bosque-demo', 'narrative'),
  ('guardian-del-bosque-demo', 'open-world'),
  ('circuito-neon-demo', 'racing'),
  ('circuito-neon-demo', 'multiplayer'),
  ('expedicion-futura-demo', 'upcoming-demo')
) as mapping(game_slug, tag_slug)
join public.games g on g.slug = mapping.game_slug
join public.tags t on t.slug = mapping.tag_slug
on conflict do nothing;

insert into public.game_variants (
  game_id, platform_id, version_key, version_label, price, compare_at_price,
  availability, release_date, is_active
)
select g.id, p.id, v.version_key, v.version_label, v.price, v.compare_at_price,
  v.availability::public.availability_status, v.release_date::date, true
from (values
  ('guardian-del-bosque-demo', 'ps5', 'standard', 'Edición estándar (DEMO)', 10.00, 15.00, 'available', null),
  ('guardian-del-bosque-demo', 'xbox-series-xs', 'standard', 'Edición estándar (DEMO)', 10.00, null, 'available', null),
  ('circuito-neon-demo', 'nintendo-switch', 'standard', 'Edición estándar (DEMO)', 10.00, null, 'available', null),
  ('expedicion-futura-demo', 'nintendo-switch-2', 'standard', 'Ficha de lanzamiento (DEMO)', 0.00, null, 'upcoming', '2027-01-01')
) as v(game_slug, platform_slug, version_key, version_label, price, compare_at_price, availability, release_date)
join public.games g on g.slug = v.game_slug
join public.platforms p on p.slug = v.platform_slug
on conflict (game_id, platform_id, version_key) do update set
  version_label = excluded.version_label, price = excluded.price,
  compare_at_price = excluded.compare_at_price, availability = excluded.availability,
  release_date = excluded.release_date, is_active = excluded.is_active;

insert into public.collections (slug, name, type, is_active, sort_order)
values
  ('featured', 'En portada', 'placement', true, 1),
  ('best-sellers', 'Más vendidos', 'placement', true, 2),
  ('featured-offers', 'Ofertas destacadas', 'placement', true, 3),
  ('recommended', 'Recomendados', 'placement', true, 4),
  ('upcoming', 'Próximamente', 'placement', true, 5)
on conflict (slug) do update set name = excluded.name, type = excluded.type, is_active = excluded.is_active, sort_order = excluded.sort_order;

insert into public.collection_items (collection_id, game_variant_id, position)
select c.id, v.id, mapping.position
from (values
  ('featured', 'guardian-del-bosque-demo', 'ps5', 1),
  ('featured', 'circuito-neon-demo', 'nintendo-switch', 2),
  ('best-sellers', 'guardian-del-bosque-demo', 'xbox-series-xs', 1),
  ('featured-offers', 'guardian-del-bosque-demo', 'ps5', 1),
  ('recommended', 'guardian-del-bosque-demo', 'ps5', 1),
  ('recommended', 'circuito-neon-demo', 'nintendo-switch', 2),
  ('upcoming', 'expedicion-futura-demo', 'nintendo-switch-2', 1)
) as mapping(collection_slug, game_slug, platform_slug, position)
join public.collections c on c.slug = mapping.collection_slug
join public.games g on g.slug = mapping.game_slug
join public.platforms p on p.slug = mapping.platform_slug
join public.game_variants v on v.game_id = g.id and v.platform_id = p.id and v.version_key = 'standard'
on conflict (collection_id, game_variant_id) do update set position = excluded.position;

insert into public.recommendation_moods (slug, label, max_price, sort_mode, max_results, is_active, sort_order)
values
  ('una-historia', 'Una buena historia (DEMO)', null, 'editorial', 3, true, 1),
  ('carreras', 'Algo de carreras (DEMO)', null, 'price_asc', 3, true, 2)
on conflict (slug) do update set
  label = excluded.label, max_price = excluded.max_price, sort_mode = excluded.sort_mode,
  max_results = excluded.max_results, is_active = excluded.is_active, sort_order = excluded.sort_order;

insert into public.recommendation_mood_tags (mood_id, tag_id)
select m.id, t.id
from (values ('una-historia', 'narrative'), ('carreras', 'racing')) as mapping(mood_slug, tag_slug)
join public.recommendation_moods m on m.slug = mapping.mood_slug
join public.tags t on t.slug = mapping.tag_slug
on conflict do nothing;

insert into public.recommendation_mood_genres (mood_id, genre_id)
select m.id, g.id
from (values ('una-historia', 'adventure'), ('carreras', 'racing')) as mapping(mood_slug, genre_slug)
join public.recommendation_moods m on m.slug = mapping.mood_slug
join public.genres g on g.slug = mapping.genre_slug
on conflict do nothing;

insert into public.site_settings (
  id, brand_name, country, currency, logo_path, whatsapp_number,
  facebook_url, youtube_url, email, analytics_id
)
values (1, 'ROCK GAMES', 'MX', 'MXN', '/assets/rock-games-logo.png', '', '', '', '', '')
on conflict (id) do update set
  brand_name = excluded.brand_name, country = excluded.country, currency = excluded.currency,
  logo_path = excluded.logo_path;

insert into public.site_sections (
  key, eyebrow, title, highlighted_text, description, media_path, poster_path,
  media_alt, cta_label, cta_url, is_visible, sort_order
)
values
  ('hero', 'ROCK GAMES / JUEGOS DIGITALES', 'TU PRÓXIMO JUEGO', 'EMPIEZA AQUÍ.', 'Contenido de demostración para desarrollo local.', '/assets/hero-forest-motion-v1.mp4', '/assets/hero-forest-art-poster-v1.jpg', '', 'Ver catálogo', '/catalogo', true, 1),
  ('platforms', 'Tu consola, tus juegos', '¿Dónde juegas?', '', '', '', '', '', 'Ver catálogo', '/catalogo', true, 2),
  ('featured', 'Selección ROCK', 'En portada', '', '', '', '', '', 'Ver juego', '/catalogo', true, 3),
  ('best_sellers', 'Selección de muestra', 'Más vendidos', '', '', '', '', '', 'Ver catálogo', '/catalogo', true, 4),
  ('offers', 'Ofertas (DEMO)', 'Un buen juego', 'a buen precio.', 'Precios de prueba. No corresponden a una oferta real.', '', '', '', 'Consultar ofertas', '', true, 5),
  ('upcoming', 'Lo que viene', 'Próximamente', '', 'Fichas de lanzamiento de demostración.', '', '', '', '', '', true, 6),
  ('how_it_works', 'Cómo comprar', 'Elige tus juegos', 'Nosotros te ayudamos.', '', '', '', '', 'Cómo funciona', '/como-funciona', true, 7),
  ('trust', 'Compra digital', 'Sin dudas antes', 'de pagar.', '', '', '', '', '', '', true, 8),
  ('testimonials', 'Referencias', 'De quienes', 'ya jugaron.', '', '', '', '', '', '', true, 9),
  ('final_cta', '¿No aparece en el catálogo?', 'Dinos qué juego', 'estás buscando.', '', '', '', '', 'Escríbenos', '', true, 10)
on conflict (key) do update set
  eyebrow = excluded.eyebrow, title = excluded.title, highlighted_text = excluded.highlighted_text,
  description = excluded.description, media_path = excluded.media_path, poster_path = excluded.poster_path,
  media_alt = excluded.media_alt, cta_label = excluded.cta_label, cta_url = excluded.cta_url,
  is_visible = excluded.is_visible, sort_order = excluded.sort_order;

-- These are paths in the existing local public/assets folder, not uploaded Storage objects.
insert into public.game_media (game_id, game_variant_id, bucket, storage_path, role, alt_text, sort_order)
select g.id, null, 'local-assets', v.path, 'cover', '', 1
from (values
  ('guardian-del-bosque-demo', '/assets/featured-elden-v1.webp'),
  ('circuito-neon-demo', '/assets/featured-forza-v1.webp'),
  ('expedicion-futura-demo', '/assets/upcoming-orbit-v1.webp')
) as v(game_slug, path)
join public.games g on g.slug = v.game_slug
on conflict (bucket, storage_path) do update set game_id = excluded.game_id, role = excluded.role, sort_order = excluded.sort_order;

-- Deliberately no testimonial rows: development seeds must not invent customer reviews.
