import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const sources = join(process.cwd(), "art-sources");
const assets = join(process.cwd(), "public", "assets");
const files = (await readdir(sources)).filter((file) => /^(featured|upcoming)-.*\.png$/.test(file));

for (const file of files) {
  const target = file.replace(/\.png$/, ".webp");
  await sharp(join(sources, file))
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(join(assets, target));
  console.log(`${file} → ${target}`);
}
