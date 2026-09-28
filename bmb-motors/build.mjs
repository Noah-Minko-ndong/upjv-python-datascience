// Construction du site : `npm run build`
//  - dist/            : scripts minifiés pour l'hébergement (le moteur 3D est chargé à part)
//  - apercu/bmb-motors-apercu.html : tout le site dans un seul fichier (s'ouvre d'un double-clic)
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const racine = path.dirname(new URL(import.meta.url).pathname);
const r = (...p) => path.join(racine, ...p);

await rm(r("dist"), { recursive: true, force: true });
await build({
  entryPoints: [r("src/main.js")],
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: ["es2020", "safari15"],
  outdir: r("dist"),
  chunkNames: "[name]-[hash]",
  legalComments: "none",
  logLevel: "info",
});

// ————— Aperçu en un seul fichier —————
const iife = await build({
  entryPoints: [r("src/main.js")],
  bundle: true,
  format: "iife",
  minify: true,
  target: ["es2020", "safari15"],
  write: false,
  legalComments: "none",
});
let js = iife.outputFiles[0].text;
let css = await readFile(r("css/site.css"), "utf8");
let html = await readFile(r("index.html"), "utf8");

// images → data URI
const images = new Set([...`${html}\n${js}`.matchAll(/assets\/[\w\-/]+\.(?:jpg|jpeg|png|webp)/g)].map((m) => m[0]));
for (const img of images) {
  if (!existsSync(r(img))) { console.warn(`(aperçu) image absente : ${img}`); continue; }
  const type = img.endsWith(".png") ? "image/png" : img.endsWith(".webp") ? "image/webp" : "image/jpeg";
  const data = `data:${type};base64,${(await readFile(r(img))).toString("base64")}`;
  html = html.split(img).join(data);
  js = js.split(img).join(data);
}
const contenu = html.slice(html.indexOf("<!--CONTENU-->") + 14, html.indexOf("<!--/CONTENU-->"));
const tete = html.slice(html.indexOf("<head>") + 6, html.indexOf("</head>"))
  .replace(/<link rel="stylesheet" href="css\/site.css">/, "")
  .replace(/<link rel="preload"[^>]*>/g, "");
const scriptSur = js.replace(/<\/script/gi, "<\\/script");

await mkdir(r("apercu"), { recursive: true });
await writeFile(r("apercu/bmb-motors-apercu.html"),
  `<!doctype html>\n<html lang="fr">\n<head>${tete}<style>\n${css}\n</style>\n</head>\n<body>\n${contenu}\n<script>\n${scriptSur}\n</script>\n</body>\n</html>\n`);

// Variante sans enveloppe <html>/<head>/<body>, pour une publication en Artifact.
if (process.argv.includes("--artifact")) {
  const sortie = process.argv[process.argv.indexOf("--artifact") + 1];
  const titre = tete.match(/<title>.*?<\/title>/)[0];
  const liens = [...tete.matchAll(/<link[^>]*fonts[^>]*>/g)].map((m) => m[0]).join("\n");
  await writeFile(sortie, `${titre}\n${liens}\n<style>\n${css}\n</style>\n${contenu}\n<script>\n${scriptSur}\n</script>\n`);
}
console.log("Construction terminée.");
