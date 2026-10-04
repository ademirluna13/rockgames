-- Safe storefront reference data. No games, prices, testimonials, or credentials.
-- Existing content always wins; this only fills an empty database.

insert into public.platform_families (slug, name, sort_order)
values ('playstation', 'PlayStation', 1), ('xbox', 'Xbox', 2), ('nintendo', 'Nintendo', 3)
on conflict (slug) do nothing;

insert into public.platforms (family_id, slug, name, sort_order)
select family.id, item.slug, item.name, item.sort_order
from (values
  ('playstation', 'ps4', 'PlayStation 4', 1),
  ('playstation', 'ps5', 'PlayStation 5', 2),
  ('xbox', 'xbox-one', 'Xbox One', 1),
  ('xbox', 'xbox-series-xs', 'Xbox Series X|S', 2),
  ('nintendo', 'nintendo-switch', 'Nintendo Switch', 1),
  ('nintendo', 'nintendo-switch-2', 'Nintendo Switch 2', 2)
) as item(family_slug, slug, name, sort_order)
join public.platform_families family on family.slug = item.family_slug
on conflict (slug) do nothing;

insert into public.collections (slug, name, sort_order)
values
  ('featured', 'En portada', 1),
  ('best-sellers', 'Más vendidos', 2),
  ('featured-offers', 'Ofertas destacadas', 3),
  ('recommended', 'Recomendados', 4),
  ('upcoming', 'Próximamente', 5)
on conflict (slug) do nothing;

insert into public.site_settings (id, brand_name, country, currency, logo_path)
values (1, 'ROCK GAMES', 'MX', 'MXN', '/assets/rock-games-logo.png')
on conflict (id) do nothing;

insert into public.site_sections (
  key, eyebrow, title, highlighted_text, description, media_path, poster_path,
  cta_label, cta_url, sort_order
)
values
  ('hero', 'ROCK GAMES / JUEGOS DIGITALES', 'TU PRÓXIMO JUEGO', 'EMPIEZA AQUÍ.',
    'Juegos digitales para PlayStation, Xbox, Nintendo Switch y Switch 2. Elige el tuyo y consúltanos por WhatsApp.',
    '/assets/hero-forest-motion-v1.mp4', '/assets/hero-forest-art-poster-v1.jpg', 'Ver catálogo', '/catalogo', 1),
  ('platforms', 'Tu consola, tus juegos', '¿Dónde juegas?', '', '', '', '', 'Ver catálogo', '/catalogo', 2),
  ('featured', 'Selección ROCK', 'En portada', '', '', '', '', 'Ver juego', '/catalogo', 3),
  ('best_sellers', 'Selección ROCK', 'Más vendidos', '', '', '', '', 'Ver catálogo', '/catalogo', 4),
  ('offers', 'Ofertas', 'Un buen juego', 'a buen precio.',
    'Las promociones cambian. Escríbenos y te contamos qué juegos tienen descuento para tu consola.',
    '', '', 'Consultar ofertas', '', 5),
  ('upcoming', 'Lo que viene', 'Próximamente', '', '', '', '', '', '', 6),
  ('how_it_works', 'Cómo comprar', 'Elige tus juegos', 'Nosotros te ayudamos.', '', '', '', 'Cómo funciona', '/como-funciona', 7),
  ('trust', 'Compra digital', 'Sin dudas antes', 'de pagar.', '', '', '', '', '', 8),
  ('testimonials', 'Referencias', 'De quienes', 'ya jugaron.', '', '', '', '', '', 9),
  ('final_cta', '¿No aparece en el catálogo?', 'Dinos qué juego', 'estás buscando.', '', '', '', 'Escríbenos', '', 10)
on conflict (key) do nothing;
