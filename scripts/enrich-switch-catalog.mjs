import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { proposals } from "./switch-metadata.mjs";

const dryRun = process.argv.includes("--dry-run");
const extra = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
if (extra.length) { console.error(`Argumentos no reconocidos: ${extra.join(", ")}`); process.exit(2); }

// Estos nombres requieren verificar la composición exacta de la oferta o el nombre comercial.
const reviewTitles = new Set([
  "Paquete Carreras (Need for Speed + Burnout)",
  "Paquete Crash Bandicoot (Trilogy + CTR + Crash 4)",
  "Paquete Dragon Ball (FighterZ + Kakarot + Xenoverse 2)",
  "Paquete Resident Evil (RE4 + RE5 + RE6)",
  "The Legend of Zelda: Breath of the Wild + Pase de Expansión",
]);

async function fetchAll(factory, label) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await factory().range(from, from + 499);
    if (error) throw new Error(`No se pudo consultar ${label}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
  }
}

async function main() {
  if (proposals.length !== 50 || new Set(proposals.map((item) => item[0])).size !== 50) throw new Error("El manifiesto debe contener exactamente 50 títulos únicos.");
  const url = process.env.PUBLIC_SUPABASE_URL?.trim(), key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const email = process.env.SUPABASE_IMPORT_EMAIL?.trim(), password = process.env.SUPABASE_IMPORT_PASSWORD;
  if (!url || !key || !email || !password) throw new Error("Faltan variables locales de Supabase o de la cuenta CMS de importación.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !auth.user) throw new Error("No se pudo autenticar la cuenta CMS.");
  const { data: admin, error: adminError } = await client.from("admin_users").select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
  if (adminError || !admin?.is_active || !["owner", "editor"].includes(admin.role)) throw new Error("La cuenta no tiene un rol CMS activo.");
  const { data: platform, error: platformError } = await client.from("platforms").select("id").eq("slug", "nintendo-switch").eq("is_active", true).maybeSingle();
  if (platformError || !platform) throw new Error("No se encontró la plataforma Nintendo Switch activa.");
  const [games, variants, gameGenres, gameTags, genres, tags] = await Promise.all([
    fetchAll(() => client.from("games").select("id,title,short_description,description,is_published").order("id"), "juegos"),
    fetchAll(() => client.from("game_variants").select("game_id,platform_id").eq("platform_id", platform.id).order("game_id"), "variantes Switch"),
    fetchAll(() => client.from("game_genres").select("game_id,genre_id").order("game_id"), "géneros de juegos"),
    fetchAll(() => client.from("game_tags").select("game_id,tag_id").order("game_id"), "etiquetas de juegos"),
    fetchAll(() => client.from("genres").select("id,name,is_active").order("name"), "géneros"),
    fetchAll(() => client.from("tags").select("id,name,is_active").order("name"), "etiquetas"),
  ]);
  const switchIds = new Set(variants.map((v) => v.game_id));
  const byTitle = new Map();
  for (const game of games.filter((item) => switchIds.has(item.id))) byTitle.set(game.title, [...(byTitle.get(game.title) ?? []), game]);
  const genreMap = new Map(genres.filter((item) => item.is_active).map((item) => [item.name.toLocaleLowerCase("es-MX"), item.id]));
  const tagMap = new Map(tags.filter((item) => item.is_active).map((item) => [item.name.toLocaleLowerCase("es-MX"), item.id]));
  const missingGenres = new Set(), missingTags = new Set();
  const plan = proposals.map(([title, short, detail, wantedGenres, wantedTags]) => {
    const matches = byTitle.get(title) ?? [];
    const game = matches.length === 1 ? matches[0] : null;
    const hasContent = game && (game.short_description?.trim() || game.description?.trim() || gameGenres.some((link) => link.game_id === game.id) || gameTags.some((link) => link.game_id === game.id));
    for (const name of wantedGenres) if (!genreMap.has(name.toLocaleLowerCase("es-MX"))) missingGenres.add(name);
    for (const name of wantedTags) if (!tagMap.has(name.toLocaleLowerCase("es-MX"))) missingTags.add(name);
    return { title, short, description: `${short} ${detail}`, wantedGenres, wantedTags, game,
      status: matches.length !== 1 ? `CONFLICTO: ${matches.length} coincidencias` : game.is_published ? "PUBLICADO — omitido" : hasContent ? "Ya tiene contenido — omitido" : reviewTitles.has(title) ? "REVISIÓN COMERCIAL — omitido" : "PENDIENTE" };
  });
  console.log("\nENRIQUECIMIENTO SWITCH · propuesta editorial\n");
  console.log(`Títulos: ${plan.length} · Pendientes aplicables: ${plan.filter((item) => item.status === "PENDIENTE").length} · Omitidos/conflictos: ${plan.filter((item) => item.status !== "PENDIENTE").length}`);
  for (const item of plan) {
    console.log(`\n${item.title}\nEstado: ${item.status}`);
    if (item.status === "PENDIENTE" || item.status === "REVISIÓN COMERCIAL — omitido") {
      console.log(`Descripción corta: ${item.short}\nDescripción completa: ${item.description}`);
      console.log(`Géneros: ${item.wantedGenres.join(", ")}\nTags: ${item.wantedTags.join(", ")}`);
    }
  }
  console.log(`\nGéneros faltantes: ${[...missingGenres].sort().join(", ") || "ninguno"}`);
  console.log(`Tags faltantes: ${[...missingTags].sort().join(", ") || "ninguno"}`);
  if (dryRun) { console.log("\nDRY RUN: no se escribió ningún dato.\n"); return; }
  if (missingGenres.size || missingTags.size) throw new Error("Faltan géneros o etiquetas requeridos. Crea primero los catálogos.");
  const candidates = plan.filter((item) => item.status === "PENDIENTE");
  if (!candidates.length) { console.log("No hay fichas pendientes que se puedan enriquecer."); return; }
  if (!stdin.isTTY) throw new Error("La aplicación requiere una terminal interactiva para confirmar.");
  const prompt = createInterface({ input: stdin, output: stdout });
  const answer = await prompt.question(`\nSe actualizarán ${candidates.length} borradores. Escribe ENRIQUECER para confirmar: `);
  prompt.close();
  if (answer.trim() !== "ENRIQUECER") { console.log("Cancelado sin cambios."); return; }
  let updated = 0;
  for (const item of candidates) {
    // Nueva lectura inmediatamente antes de escribir: nunca sobrescribir una ficha editada en el CMS.
    const { data: current, error: currentError } = await client.from("games").select("short_description,description,is_published").eq("id", item.game.id).single();
    if (currentError || !current || current.is_published || current.short_description?.trim() || current.description?.trim()) { console.log(`Omitido por cambio concurrente: ${item.title}`); continue; }
    const { data: links, error: linkError } = await client.from("game_genres").select("genre_id").eq("game_id", item.game.id);
    const { data: tagLinks, error: tagError } = await client.from("game_tags").select("tag_id").eq("game_id", item.game.id);
    if (linkError || tagError || links?.length || tagLinks?.length) { console.log(`Omitido por taxonomía preexistente: ${item.title}`); continue; }
    let write = client.from("games").update({ short_description: item.short, description: item.description })
      .eq("id", item.game.id).eq("is_published", false);
    write = current.short_description === null ? write.is("short_description", null) : write.eq("short_description", "");
    write = current.description === null ? write.is("description", null) : write.eq("description", "");
    const { data: saved, error: saveError } = await write.select("id").maybeSingle();
    if (saveError || !saved) { console.log(`No se pudo actualizar: ${item.title}`); continue; }
    const genreIds = item.wantedGenres.map((name) => genreMap.get(name.toLocaleLowerCase("es-MX"))).filter(Boolean);
    const tagIds = item.wantedTags.map((name) => tagMap.get(name.toLocaleLowerCase("es-MX"))).filter(Boolean);
    if (genreIds.length) { const { error } = await client.from("game_genres").insert(genreIds.map((genreId, index) => ({ game_id: item.game.id, genre_id: genreId, is_primary: index === 0, sort_order: index }))); if (error) console.log(`No se pudieron asociar géneros: ${item.title}`); }
    if (tagIds.length) { const { error } = await client.from("game_tags").insert(tagIds.map((tagId) => ({ game_id: item.game.id, tag_id: tagId }))); if (error) console.log(`No se pudieron asociar tags: ${item.title}`); }
    updated++;
  }
  console.log(`\nDescripciones actualizadas: ${updated}. No se modificaron publicaciones, precios, variantes, medios ni colecciones.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Error inesperado"); process.exitCode = 1; });
