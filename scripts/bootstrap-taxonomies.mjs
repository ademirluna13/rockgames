import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");
const extra = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
if (extra.length) { console.error(`Argumentos no reconocidos: ${extra.join(", ")}`); process.exit(2); }

const wanted = {
  genres: ["Acción", "Aventura", "Carreras", "Deportes", "Lucha", "Música", "Party", "Plataformas", "RPG", "Simulación", "Terror"],
  tags: ["Clásico", "Competitivo", "Cooperativo", "Creativo", "Exploración", "Familiar", "Historia", "Multijugador", "Mundo abierto", "Puzles"],
};
const keyOf = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();
const slugOf = (text) => keyOf(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function main() {
  const url = process.env.PUBLIC_SUPABASE_URL?.trim(), key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const email = process.env.SUPABASE_IMPORT_EMAIL?.trim(), password = process.env.SUPABASE_IMPORT_PASSWORD;
  if (!url || !key || !email || !password) throw new Error("Faltan credenciales locales de Supabase/CMS.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !auth.user) throw new Error("No se pudo autenticar la cuenta CMS.");
  const { data: admin, error: adminError } = await client.from("admin_users").select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
  if (adminError || !admin?.is_active || !["owner", "editor"].includes(admin.role)) throw new Error("La cuenta no tiene rol CMS activo.");

  const plans = {};
  let conflictCount = 0;
  for (const [table, names] of Object.entries(wanted)) {
    const { data, error } = await client.from(table).select("id,name,slug,is_active").order("name");
    if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
    const existing = data ?? [];
    const byKey = new Map();
    for (const row of existing) byKey.set(keyOf(row.name), [...(byKey.get(keyOf(row.name)) ?? []), row]);
    const present = [], missing = [], conflicts = [];
    for (const name of names) {
      const matches = byKey.get(keyOf(name)) ?? [];
      const slug = slugOf(name);
      const slugTaken = existing.find((row) => row.slug === slug && keyOf(row.name) !== keyOf(name));
      if (matches.length > 1) conflicts.push(`${name}: ${matches.length} nombres equivalentes`);
      else if (matches.length === 1 && (matches[0].name !== name || !matches[0].is_active || matches[0].slug !== slug || !uuid.test(matches[0].id))) conflicts.push(`${name}: existe como "${matches[0].name}" (${matches[0].slug}, ${matches[0].is_active ? "activo" : "inactivo"})`);
      else if (slugTaken) conflicts.push(`${name}: slug ${slug} ya pertenece a "${slugTaken.name}"`);
      else if (matches.length === 1) present.push(name);
      else missing.push({ name, slug, is_active: true });
    }
    plans[table] = { present, missing, conflicts };
    conflictCount += conflicts.length;
    console.log(`\n${table === "genres" ? "GÉNEROS" : "TAGS"}`);
    console.log(`Existentes: ${present.length} · Nuevos: ${missing.length} · Conflictos: ${conflicts.length}`);
    if (present.length) console.log(`Ya existen: ${present.join(", ")}`);
    if (missing.length) console.log(`Faltan: ${missing.map((row) => row.name).join(", ")}`);
    for (const conflict of conflicts) console.log(`CONFLICTO: ${conflict}`);
  }
  if (conflictCount) throw new Error("Hay conflictos semánticos; no se realizará ninguna escritura.");
  if (dryRun) { console.log("\nDRY RUN: sin escrituras."); return; }
  if (!plans.genres.missing.length && !plans.tags.missing.length) { console.log("\nLas taxonomías ya están completas. Sin escrituras."); return; }
  if (!stdin.isTTY) throw new Error("Se requiere terminal interactiva para confirmar.");
  const prompt = createInterface({ input: stdin, output: stdout });
  const answer = await prompt.question("\nEscribe CREAR TAXONOMÍAS para insertar los términos faltantes: ");
  prompt.close();
  if (answer.trim() !== "CREAR TAXONOMÍAS") { console.log("Cancelado sin cambios."); return; }
  for (const table of ["genres", "tags"]) {
    const rows = plans[table].missing;
    if (!rows.length) continue;
    const { data, error } = await client.from(table).insert(rows).select("id,name,slug,is_active");
    if (error || data?.length !== rows.length) throw new Error(`Falló la inserción de ${table}. Reejecuta el dry-run antes de intentar de nuevo.`);
    console.log(`${table}: ${data.length} creados (${data.map((row) => row.name).join(", ")}).`);
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Error inesperado"); process.exitCode = 1; });
