import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";

const catalog = [
  ["Animal Crossing: New Horizons", 299],
  ["Batman: Arkham Trilogy", 299],
  ["Cuphead + DLC (The Delicious Last Course)", 149],
  ["Donkey Kong Country: Tropical Freeze", 299],
  ["Dragon Ball: Sparking! ZERO", 299],
  ["EA Sports FC 24", 249],
  ["EA Sports FC 25", 299],
  ["EA Sports FC 26", 299],
  ["EA Sports FC 27", 299],
  ["FIFA 23", 199],
  ["Five Nights at Freddy's: Security Breach", 249],
  ["Grand Theft Auto: The Trilogy – The Definitive Edition", 249],
  ["Hogwarts Legacy", 299],
  ["Just Dance 2023 Edition", 199],
  ["Kirby and the Forgotten Land", 299],
  ["Leyendas Pokémon: Arceus", 299],
  ["Leyendas Pokémon: Z-A", 299],
  ["Luigi's Mansion 2 HD", 299],
  ["Luigi's Mansion 3", 299],
  ["Mario & Sonic en los Juegos Olímpicos: Tokio 2020", 199],
  ["Mario Kart 8 Deluxe", 299],
  ["Mario Party Superstars", 299],
  ["Mario Strikers: Battle League", 299],
  ["Marvel vs. Capcom Fighting Collection: Arcade Classics", 299],
  ["Metroid Dread", 299],
  ["Metroid Prime Remastered", 249],
  ["Minecraft", 149],
  ["Mortal Kombat 1", 299],
  ["New Super Mario Bros. U Deluxe", 299],
  ["Nintendo Switch Sports", 249],
  ["Pack Little Nightmares (I + II)", 249],
  ["Paquete Carreras (Need for Speed + Burnout)", 199],
  ["Paquete Crash Bandicoot (Trilogy + CTR + Crash 4)", 299],
  ["Paquete Dragon Ball (FighterZ + Kakarot + Xenoverse 2)", 299],
  ["Paquete Five Nights at Freddy's: Core Collection", 299],
  ["Paquete Resident Evil (RE4 + RE5 + RE6)", 299],
  ["Pokémon Escudo", 299],
  ["Pokémon: Let's Go, Pikachu!", 299],
  ["Pokémon Púrpura (Violet)", 299],
  ["Red Dead Redemption", 249],
  ["Super Mario 3D World + Bowser's Fury", 299],
  ["Super Mario Bros. Wonder", 299],
  ["Super Mario Galaxy", 299],
  ["Super Mario Odyssey", 299],
  ["Super Mario Party Jamboree", 299],
  ["Super Smash Bros. Ultimate", 299],
  ["The Legend of Zelda: Breath of the Wild + Pase de Expansión", 399],
  ["The Legend of Zelda: Echoes of Wisdom", 299],
  ["The Legend of Zelda: Tears of the Kingdom", 299],
  ["Tomodachi Life: Living the Dream", 299],
].map(([title, price]) => ({ title, price }));

const dryRun = process.argv.includes("--dry-run");
const unexpectedArgs = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
if (unexpectedArgs.length) {
  console.error(`Argumentos no reconocidos: ${unexpectedArgs.join(", ")}`);
  process.exit(2);
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/\+/g, " plus ")
    .replace(/[–—]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

function titleKey(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function getAll(queryFactory, label) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw new Error(`No se pudo consultar ${label}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

function printPlan(plan) {
  const newGames = plan.filter((item) => item.gameAction === "new");
  const existingGames = plan.filter((item) => item.gameAction === "existing");
  const newVariants = plan.filter((item) => item.variantAction === "new");
  const existingVariants = plan.filter((item) => item.variantAction === "existing");
  const conflicts = plan.filter((item) => item.conflict);

  console.log("\nCATÁLOGO SWITCH · Nintendo Switch / Estándar · MXN\n");
  console.log(`Productos en lista: ${catalog.length}`);
  console.log(`Juegos nuevos: ${newGames.length}`);
  console.log(`Juegos ya existentes: ${existingGames.length}`);
  console.log(`Variantes nuevas: ${newVariants.length}`);
  console.log(`Variantes existentes: ${existingVariants.length}`);
  console.log(`Conflictos: ${conflicts.length}`);

  if (newGames.length) {
    console.log("\nJuegos nuevos:");
    for (const item of newGames) console.log(`- ${item.title} — $${item.price}`);
  }
  if (existingGames.length) {
    console.log("\nJuegos existentes:");
    for (const item of existingGames) console.log(`- ${item.title} → ${item.matchedGame.title}`);
  }
  if (existingVariants.length) {
    console.log("\nVariantes existentes (se omiten):");
    for (const item of existingVariants) console.log(`- ${item.title}`);
  }
  if (conflicts.length) {
    console.log("\nConflictos que bloquean toda escritura:");
    for (const item of conflicts) console.log(`- ${item.title}: ${item.conflict}`);
  }
  console.log(dryRun ? "\nDRY RUN: no se escribieron juegos ni variantes.\n" : "");
}

async function main() {
  const url = process.env.PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const email = process.env.SUPABASE_IMPORT_EMAIL?.trim();
  const password = process.env.SUPABASE_IMPORT_PASSWORD;

  if (!url || !publishableKey) throw new Error("Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.");
  if (!email || !password) {
    throw new Error("Faltan SUPABASE_IMPORT_EMAIL y SUPABASE_IMPORT_PASSWORD en .env. Usa la cuenta administradora del CMS; nunca agregues estas variables con prefijo PUBLIC_.");
  }

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !auth.user) throw new Error("No se pudo iniciar sesión como administrador. Revisa las credenciales locales de importación.");

  const { data: admin, error: adminError } = await client
    .from("admin_users")
    .select("role,is_active")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (adminError || !admin?.is_active || !["owner", "editor"].includes(admin.role)) {
    throw new Error("La cuenta autenticada no tiene un rol CMS activo para importar catálogo.");
  }

  const { data: platforms, error: platformError } = await client
    .from("platforms")
    .select("id,slug,name,is_active")
    .eq("slug", "nintendo-switch")
    .eq("name", "Nintendo Switch")
    .eq("is_active", true);
  if (platformError) throw new Error(`No se pudo localizar Nintendo Switch: ${platformError.message}`);
  if (platforms?.length !== 1) throw new Error(`Se esperaba un registro activo de Nintendo Switch; se encontraron ${platforms?.length ?? 0}.`);
  const platform = platforms[0];

  const games = await getAll(
    () => client.from("games").select("id,slug,title,is_published").order("id"),
    "juegos",
  );
  const variants = await getAll(
    () => client.from("game_variants").select("id,game_id,platform_id,version_key,version_label,account_type,is_active,availability,price,compare_at_price").eq("platform_id", platform.id).order("id"),
    "variantes de Nintendo Switch",
  );

  const slugOwners = new Map();
  const titleOwners = new Map();
  for (const game of games) {
    slugOwners.set(game.slug, [...(slugOwners.get(game.slug) ?? []), game]);
    const key = titleKey(game.title);
    titleOwners.set(key, [...(titleOwners.get(key) ?? []), game]);
  }

  const inputSlugs = new Map();
  for (const item of catalog) {
    item.slug = slugify(item.title);
    item.versionKey = slugify("Estándar");
    inputSlugs.set(item.slug, [...(inputSlugs.get(item.slug) ?? []), item]);
  }

  const plan = catalog.map((item) => {
    const conflicts = [];
    if (!item.slug || !item.versionKey) conflicts.push("título sin slug válido");
    if ((inputSlugs.get(item.slug)?.length ?? 0) > 1) conflicts.push("el catálogo contiene dos títulos con el mismo slug");

    const bySlug = slugOwners.get(item.slug) ?? [];
    const byTitle = titleOwners.get(titleKey(item.title)) ?? [];
    const matched = [...new Map([...bySlug, ...byTitle].map((game) => [game.id, game])).values()];
    if (matched.length > 1) conflicts.push("el título y/o slug coinciden con varios juegos existentes");

    const existingGame = matched[0] ?? null;
    if (existingGame && titleKey(existingGame.title) !== titleKey(item.title)) {
      conflicts.push(`el slug «${item.slug}» ya pertenece a «${existingGame.title}»`);
    }

    const editionVariants = existingGame
      ? variants.filter((variant) => variant.game_id === existingGame.id && variant.version_key === item.versionKey)
      : [];
    const matchedVariants = editionVariants.filter((variant) => variant.account_type === "secondary");
    const unknownVariants = editionVariants.filter((variant) => variant.account_type === null);
    const variantExists = matchedVariants.length === 1;
    if (matchedVariants.length > 1) conflicts.push("hay dos variantes secundarias para la misma plataforma y edición");
    if (unknownVariants.length) conflicts.push("hay una variante de modalidad desconocida para esta edición; aplica y verifica la migración antes de importar");

    return {
      ...item,
      matchedGame: existingGame,
      gameAction: existingGame ? "existing" : "new",
      variantAction: variantExists ? "existing" : "new",
      conflict: conflicts.join("; ") || null,
    };
  });

  printPlan(plan);
  const conflicts = plan.filter((item) => item.conflict);
  if (conflicts.length) throw new Error("Importación cancelada: resuelve todos los conflictos antes de escribir.");
  if (dryRun) return;

  const newGames = plan.filter((item) => item.gameAction === "new");
  const newGameRows = newGames.map(({ title, slug }) => ({ title, slug, is_published: false }));
  const prompt = createInterface({ input: stdin, output: stdout });
  const confirmation = await prompt.question(`Se insertarán ${newGames.length} juegos y ${plan.filter((item) => item.variantAction === "new").length} variantes con la cuenta ${email}. Escribe IMPORTAR para continuar: `);
  prompt.close();
  if (confirmation.trim() !== "IMPORTAR") {
    console.log("Cancelado. No se escribió contenido comercial.");
    return;
  }

  const insertedBySlug = new Map();
  if (newGameRows.length) {
    const { data: insertedGames, error } = await client.from("games").insert(newGameRows).select("id,slug,title,is_published");
    if (error) throw new Error(`No se pudieron insertar los juegos; no se intentaron variantes: ${error.message}`);
    for (const game of insertedGames ?? []) insertedBySlug.set(game.slug, game);
  }

  const variantRows = plan
    .filter((item) => item.variantAction === "new")
    .map((item) => {
      const game = item.matchedGame ?? insertedBySlug.get(item.slug);
      if (!game) throw new Error(`No se encontró el juego insertado para «${item.title}».`);
      return {
        game_id: game.id,
        platform_id: platform.id,
        version_key: item.versionKey,
        version_label: "Estándar",
        account_type: "secondary",
        price: item.price,
        compare_at_price: null,
        availability: "available",
        is_active: true,
      };
    });

  if (variantRows.length) {
    const { error } = await client.from("game_variants").insert(variantRows);
    if (error) throw new Error(`Los juegos se insertaron pero hubo un problema al guardar variantes. Reejecutar detectará lo existente y completará faltantes: ${error.message}`);
  }

  console.log(`Importación completada: ${newGameRows.length} juegos y ${variantRows.length} variantes insertados. No se publicaron juegos ni se añadieron colecciones o medios.`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
