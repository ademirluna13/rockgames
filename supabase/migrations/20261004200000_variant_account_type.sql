-- Commercial identity: platform + edition + account modality.
-- No default is provided: every future writer must choose the modality explicitly.
create type public.account_type as enum ('primary', 'secondary');
alter table public.game_variants add column account_type public.account_type;

-- Exact source manifest from scripts/import-switch-catalog.mjs (title + MXN price).
-- This temporary table is used only for a guarded backfill; it creates no catalog data.
create temporary table rg_switch_import_expected (
  title text primary key,
  price numeric(10,2) not null
);
insert into rg_switch_import_expected (title, price) values
  ('Animal Crossing: New Horizons', 299),
  ('Batman: Arkham Trilogy', 299),
  ('Cuphead + DLC (The Delicious Last Course)', 149),
  ('Donkey Kong Country: Tropical Freeze', 299),
  ('Dragon Ball: Sparking! ZERO', 299),
  ('EA Sports FC 24', 249),
  ('EA Sports FC 25', 299),
  ('EA Sports FC 26', 299),
  ('EA Sports FC 27', 299),
  ('FIFA 23', 199),
  ('Five Nights at Freddy''s: Security Breach', 249),
  ('Grand Theft Auto: The Trilogy – The Definitive Edition', 249),
  ('Hogwarts Legacy', 299),
  ('Just Dance 2023 Edition', 199),
  ('Kirby and the Forgotten Land', 299),
  ('Leyendas Pokémon: Arceus', 299),
  ('Leyendas Pokémon: Z-A', 299),
  ('Luigi''s Mansion 2 HD', 299),
  ('Luigi''s Mansion 3', 299),
  ('Mario & Sonic en los Juegos Olímpicos: Tokio 2020', 199),
  ('Mario Kart 8 Deluxe', 299),
  ('Mario Party Superstars', 299),
  ('Mario Strikers: Battle League', 299),
  ('Marvel vs. Capcom Fighting Collection: Arcade Classics', 299),
  ('Metroid Dread', 299),
  ('Metroid Prime Remastered', 249),
  ('Minecraft', 149),
  ('Mortal Kombat 1', 299),
  ('New Super Mario Bros. U Deluxe', 299),
  ('Nintendo Switch Sports', 249),
  ('Pack Little Nightmares (I + II)', 249),
  ('Paquete Carreras (Need for Speed + Burnout)', 199),
  ('Paquete Crash Bandicoot (Trilogy + CTR + Crash 4)', 299),
  ('Paquete Dragon Ball (FighterZ + Kakarot + Xenoverse 2)', 299),
  ('Paquete Five Nights at Freddy''s: Core Collection', 299),
  ('Paquete Resident Evil (RE4 + RE5 + RE6)', 299),
  ('Pokémon Escudo', 299),
  ('Pokémon: Let''s Go, Pikachu!', 299),
  ('Pokémon Púrpura (Violet)', 299),
  ('Red Dead Redemption', 249),
  ('Super Mario 3D World + Bowser''s Fury', 299),
  ('Super Mario Bros. Wonder', 299),
  ('Super Mario Galaxy', 299),
  ('Super Mario Odyssey', 299),
  ('Super Mario Party Jamboree', 299),
  ('Super Smash Bros. Ultimate', 299),
  ('The Legend of Zelda: Breath of the Wild + Pase de Expansión', 399),
  ('The Legend of Zelda: Echoes of Wisdom', 299),
  ('The Legend of Zelda: Tears of the Kingdom', 299),
  ('Tomodachi Life: Living the Dream', 299);

do $$
declare
  imported_count integer;
  total_count integer;
  distinct_title_count integer;
begin
  select count(*) into total_count from public.game_variants;
  select count(*) into imported_count
  from public.game_variants v
  join public.games g on g.id = v.game_id
  join public.platforms p on p.id = v.platform_id
  join rg_switch_import_expected e on e.title = g.title and e.price = v.price
  where p.slug = 'nintendo-switch'
    and v.version_key = 'estandar'
    and v.version_label = 'Estándar'
    and v.account_type is null
    and g.is_published = false;
  select count(distinct g.title) into distinct_title_count
  from public.game_variants v
  join public.games g on g.id = v.game_id
  join public.platforms p on p.id = v.platform_id
  join rg_switch_import_expected e on e.title = g.title and e.price = v.price
  where p.slug = 'nintendo-switch'
    and v.version_key = 'estandar'
    and v.version_label = 'Estándar'
    and v.account_type is null
    and g.is_published = false;

  if (select count(*) from rg_switch_import_expected) <> 50 then
    raise exception 'Backfill manifest must contain exactly 50 entries';
  end if;
  if not (total_count = 0 or (total_count = 50 and imported_count = 50 and distinct_title_count = 50)) then
    raise exception 'Found % variants, but only % match the 50 verified Switch imports. Audit historical variants before applying account_type.', total_count, imported_count;
  end if;

  if imported_count = 50 then
    update public.game_variants v set account_type = 'secondary'::public.account_type
    from public.games g, public.platforms p, rg_switch_import_expected e
    where v.game_id = g.id and v.platform_id = p.id
      and e.title = g.title and e.price = v.price
      and p.slug = 'nintendo-switch'
      and v.version_key = 'estandar'
      and v.version_label = 'Estándar'
      and v.account_type is null and g.is_published = false;
  end if;
  if exists (select 1 from public.game_variants where account_type is null) then
    raise exception 'Unclassified historical variants remain; NOT NULL is unsafe';
  end if;
end $$;

alter table public.game_variants alter column account_type set not null;
alter table public.game_variants drop constraint game_variants_game_platform_version_unique;
alter table public.game_variants
  add constraint game_variants_game_platform_version_account_unique
  unique (game_id, platform_id, version_key, account_type);

drop table rg_switch_import_expected;

-- Existing RLS policies remain unchanged.
