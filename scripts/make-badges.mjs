#!/usr/bin/env node
/**
 * make-badges - open the Badges app, download an image per item, and inject them.
 *
 * Usage:
 *   node scripts/make-badges.mjs <manifest.json> [--url http://localhost:3038]
 *
 * manifest.json:
 *   {
 *     "name": "Top Flowers",         // becomes the export name + Desktop folder
 *     "size": "Mini",                // Large | Small | Mini | Micro | Nano
 *     "items": [
 *       { "label": "Marigold", "query": "marigold flower plant" },
 *       ...
 *     ]
 *   }
 *
 * Images come from Openverse (Creative-Commons, no API key). Downloads land in
 * ~/Desktop/Badges-<slug>/ as 01-Label.ext so they import in order.
 *
 * Requires Playwright's chromium (already on this machine via the E2E tooling;
 * otherwise: npx playwright install chromium).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadChromium() {
  for (const p of ["playwright", "playwright-core"]) {
    try { return require(p).chromium; } catch {}
  }
  const base = path.join(os.homedir(), ".npm/_npx");
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base)) {
      const mod = path.join(base, d, "node_modules/playwright");
      if (fs.existsSync(mod)) return require(mod).chromium;
    }
  }
  throw new Error("playwright not found - run: npx playwright install chromium");
}

const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
const UA = { "User-Agent": "badges-make/1.0 (personal badge tool)" };

function extFor(type, url) {
  const t = (type || "").split(";")[0];
  if (EXT[t]) return EXT[t];
  const m = (url || "").toLowerCase().match(/\.(png|jpe?g|webp|gif)(?:\?|$)/);
  return m ? m[1].replace("jpeg", "jpg") : null;
}

// Reject images that look like they contain people (title/tags), so no humans
// end up on the badges.
const PEOPLE = /\b(person|people|man|men|woman|women|girl|boy|kid|child|children|human|portrait|face|selfie|model|crowd|hand|holding|wedding|bride|groom|couple|family|lady|guy|worker|farmer|gardener)\b/i;
// Reject non-photo images: SVG-rendered glyphs/logos/diagrams (e.g. the
// "Chrysanthemum (Chinese characters)" kanji), maps, seals, coats of arms.
const NOT_PHOTO = /\.svg|characters|calligraphy|kanji|hanzi|glyph|\blogo\b|\bsymbol\b|\bicon\b|diagram|illustration|\bmap\b|coat[_ ]of[_ ]arms|\bseal\b|drawing|painting/i;
function hasPeople(result) {
  if (PEOPLE.test(result.title || "")) return true;
  const tags = (result.tags || []).map((t) => (t.name || "").toLowerCase());
  return tags.some((t) => PEOPLE.test(t));
}

async function tryDownload(url) {
  if (!url) return null;
  // Filename-based guard applied to EVERY source (Wikipedia + Openverse): no
  // humans, no glyphs/logos/diagrams - just clean flower photos.
  const fname = decodeURIComponent((url.split("/").pop() || "").split("?")[0]);
  if (PEOPLE.test(fname) || NOT_PHOTO.test(url)) return null;
  try {
    const img = await fetch(url, { headers: UA });
    const type = img.headers.get("content-type") || "";
    if (img.ok && type.startsWith("image/")) {
      const ext = extFor(type, url) || "jpg";
      if (ext === "svg") return null; // canvas export prefers raster
      return { buf: Buffer.from(await img.arrayBuffer()), ext };
    }
  } catch {}
  return null;
}

async function wikiImage(title) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
      { headers: UA }
    );
    if (!res.ok) return null;
    const d = await res.json();
    return (await tryDownload(d.originalimage?.source)) || (await tryDownload(d.thumbnail?.source));
  } catch { return null; }
}

// Resolve a term to its best-matching Wikipedia article title via full-text
// search (Coneflower -> Echinacea, "Cosmos flower" -> Cosmos (plant)). Full-text
// beats opensearch's prefix match for disambiguation. Retries transient failures.
async function wikiResolve(term) {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json` +
    `&srsearch=${encodeURIComponent(term)}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.ok) {
        const d = await res.json();
        const title = d?.query?.search?.[0]?.title;
        if (title) return title;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

// Primary: Wikipedia page image (canonical photo per named thing). Fallback: Openverse.
async function fetchImage(label, query, topic) {
  // Topic-qualified FIRST so ambiguous names resolve to the right subject
  // ("Cosmos" the astronomy article vs "Cosmos flower" the plant).
  let got = null;
  if (topic) {
    const title = await wikiResolve(`${label} ${topic}`);
    if (title) got = await wikiImage(title);
    if (!got) got = await wikiImage(`${label} ${topic}`);
  }
  // Only fall back to the bare label if the topic-qualified lookup found nothing.
  if (!got) {
    const title = await wikiResolve(label);
    got = (await wikiImage(label)) || (title ? await wikiImage(title) : null);
  }
  if (got) return got;
  try {
    const api = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query || label)}&page_size=12&mature=false`;
    const res = await fetch(api, { headers: UA });
    if (res.ok) {
      const data = await res.json();
      for (const r of data.results || []) {
        if (hasPeople(r)) continue; // no humans on the badges
        const got = (await tryDownload(r.url)) || (await tryDownload(r.thumbnail));
        if (got) return got;
      }
    }
  } catch {}
  return null;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: node scripts/make-badges.mjs <manifest.json>");
  const urlFlag = process.argv.indexOf("--url");
  const URL = urlFlag > -1 ? process.argv[urlFlag + 1] : "http://localhost:3038";

  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const size = manifest.size || "Small";
  const slug = manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const outDir = path.join(os.homedir(), "Desktop", `Badges-${slug}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`downloading ${manifest.items.length} images -> ${outDir}`);
  const files = [];
  for (let i = 0; i < manifest.items.length; i++) {
    const it = manifest.items[i];
    const safe = it.label.replace(/[^\w -]/g, "").trim();
    const n = String(i + 1).padStart(2, "0");
    try {
      const got = await fetchImage(it.label, it.query, manifest.topic);
      if (!got) { console.log(`  [skip] ${it.label} (no image)`); continue; }
      const fp = path.join(outDir, `${n}-${safe}.${got.ext}`);
      fs.writeFileSync(fp, got.buf);
      files.push(fp);
      console.log(`  [ok]   ${n}-${safe}.${got.ext}`);
    } catch (e) {
      console.log(`  [fail] ${it.label}: ${e.message}`);
    }
  }
  if (!files.length) throw new Error("no images downloaded");

  console.log(`opening ${URL} and injecting ${files.length} images...`);
  const chromium = loadChromium();
  const browser = await chromium.launch({ headless: false, args: ["--window-size=1500,980"] });
  browser.on("disconnected", () => process.exit(0));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  const input = page.locator('input[type="file"]').first();
  await input.waitFor({ state: "attached", timeout: 15000 });
  await input.setInputFiles(files);
  await page.waitForFunction(() => document.querySelectorAll("img").length >= 5, null, { timeout: 20000 }).catch(() => {});
  await page.getByRole("button", { name: new RegExp(`^${size}`) }).click({ timeout: 5000 }).catch(() => {});
  await page.getByPlaceholder(/Name/i).fill(manifest.name).catch(() => {});
  console.log(`done - ${files.length} badges loaded, size=${size}. Window stays open.`);
  await new Promise(() => {});
}

main().catch((e) => { console.error("make-badges failed:", e.message); process.exit(1); });
