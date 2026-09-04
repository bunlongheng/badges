#!/usr/bin/env node
/**
 * check-duplex - prove a double-sided badge PDF will line up front-to-back.
 *
 * Usage:
 *   node scripts/check-duplex.mjs ~/Desktop/badges.pdf [--out DIR]
 *
 * Each page pair is front then back. The back is printed on the reverse of the
 * front (duplex, flip on long edge), so every back badge must be the exact mirror
 * of its front badge. This compares the badge SILHOUETTES - the photos themselves
 * are not mirrored, so comparing pixels directly would be meaningless.
 *
 * It writes one proof image per page pair:
 *   grey disc  = front and back agree
 *   red edge   = front only  (badge sticks out on the front)
 *   cyan edge  = back only   (badge sticks out on the back)
 *
 * Requires poppler's pdfimages (brew install poppler) and Playwright's chromium.
 */
import { execFileSync } from "node:child_process";
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
  if (fs.existsSync(base)) for (const d of fs.readdirSync(base)) {
    const mod = path.join(base, d, "node_modules/playwright");
    if (fs.existsSync(mod)) return require(mod).chromium;
  }
  throw new Error("playwright not found - run: npx playwright install chromium");
}

const pdf = process.argv[2];
if (!pdf) throw new Error("usage: node scripts/check-duplex.mjs <file.pdf> [--out DIR]");
const outFlag = process.argv.indexOf("--out");
const outDir = outFlag > -1 ? process.argv[outFlag + 1] : path.dirname(path.resolve(pdf));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "duplex-"));
execFileSync("pdfimages", ["-j", path.resolve(pdf), path.join(tmp, "p")]);
const pages = fs.readdirSync(tmp).filter((f) => /\.(jpg|png|ppm)$/.test(f)).sort();
if (pages.length < 2 || pages.length % 2) {
  throw new Error(`expected front/back page pairs, found ${pages.length} page images - was this exported with Double-sided on?`);
}

const browser = await loadChromium().launch({ headless: true });
const page = await browser.newPage();
await page.goto("about:blank");
let failed = 0;

for (let p = 0; p < pages.length; p += 2) {
  const [front, back] = [pages[p], pages[p + 1]].map((f) => path.join(tmp, f));
  const asUrl = (f) => `data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}`;
  const r = await page.evaluate(async ({ f, k }) => {
    const load = async (u) => { const i = new Image(); await new Promise((r, j) => { i.onload = r; i.onerror = j; i.src = u; }); return i; };
    const [F, B] = await Promise.all([load(f), load(k)]);
    const W = F.width, H = F.height;
    const grab = (img) => { const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
      return x.getImageData(0, 0, W, H).data; };
    const A = grab(F), C = grab(B);
    const lum = (D, j) => 0.299 * D[j] + 0.587 * D[j + 1] + 0.114 * D[j + 2];

    // Badge bands: project ink onto each axis, ignoring the hairline cut guides
    // (a guide is ~2px, so require a run of 7 ink pixels before counting one).
    const bands = (axis) => {
      const n = axis === "x" ? W : H, m = axis === "x" ? H : W, hits = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let run = 0;
        for (let j = 0; j < m; j++) {
          const idx = axis === "x" ? (j * W + i) * 4 : (i * W + j) * 4;
          run = lum(A, idx) < 205 ? run + 1 : 0;
          if (run >= 7) { hits[i]++; }
        }
      }
      const out = []; let s = -1;
      for (let i = 0; i < n; i++) {
        const on = hits[i] > m * 0.02;
        if (on && s < 0) s = i;
        if ((!on || i === n - 1) && s >= 0) { if (i - s > 20) out.push([s, on ? i : i - 1]); s = -1; }
      }
      return out;
    };
    const cols = bands("x"), rows = bands("y");

    // Silhouette of one badge: flood the white paper in from the rect corners;
    // whatever it cannot reach is the badge, whatever its photo looks like.
    const silhouette = (D, x0, y0, w, h) => {
      const m = new Uint8Array(w * h), stack = [];
      const white = (px, py) => lum(D, ((y0 + py) * W + (x0 + px)) * 4) > 205;
      const push = (px, py) => { if (px < 0 || py < 0 || px >= w || py >= h) return;
        const i = py * w + px; if (m[i] || !white(px, py)) return; m[i] = 1; stack.push(i); };
      push(0, 0); push(w - 1, 0); push(0, h - 1); push(w - 1, h - 1);
      while (stack.length) { const i = stack.pop(), px = i % w, py = (i / w) | 0;
        push(px + 1, py); push(px - 1, py); push(px, py + 1); push(px, py - 1); }
      return m;
    };

    const oc = document.createElement("canvas"); oc.width = W; oc.height = H;
    const g = oc.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    const id = g.getImageData(0, 0, W, H), O = id.data;
    let worst = 0, badges = 0, edge = 0;
    for (const [ry, ry2] of rows) for (const [rx, rx2] of cols) {
      const w = rx2 - rx + 1, h = ry2 - ry + 1;
      const bx = W - rx - w;                       // the mirrored slot on the back
      if (bx < 0 || bx + w > W) continue;
      const sF = silhouette(A, rx, ry, w, h), sB = silhouette(C, bx, ry, w, h);
      let mism = 0;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const a = sF[py * w + px] === 0, b = sB[py * w + (w - 1 - px)] === 0;
        const j = ((ry + py) * W + (rx + px)) * 4;
        if (a && b) { O[j] = O[j + 1] = 228; O[j + 2] = 230; }
        else if (a) { O[j] = 214; O[j + 1] = 32; O[j + 2] = 48; mism++; }
        else if (b) { O[j] = 0; O[j + 1] = 170; O[j + 2] = 200; mism++; }
        O[j + 3] = 255;
      }
      badges++; edge = Math.max(edge, h); worst = Math.max(worst, mism);
    }
    g.putImageData(id, 0, 0);
    return { png: oc.toDataURL("image/png"), worst, badges, edge, W, H };
  }, { f: asUrl(front), k: asUrl(back) });

  // One pixel of shift paints at least one full badge edge; anything well under
  // that is JPEG speckle along the rim, not a real offset.
  const limit = Math.max(30, r.edge / 2);
  const ok = r.worst < limit;
  if (!ok) failed++;
  const file = path.join(outDir, `${path.basename(pdf, ".pdf")}-duplex-${p / 2 + 1}.png`);
  fs.writeFileSync(file, Buffer.from(r.png.split(",")[1], "base64"));
  console.log(`sheet ${p / 2 + 1}: ${r.badges} badges  worst edge mismatch ${r.worst}px (1px out >= ${Math.round(limit)}px)  ${ok ? "ALIGNED" : "MISALIGNED"}`);
  console.log(`          proof: ${file}`);
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} sheet(s) MISALIGNED - re-export before printing.` : "\nEvery sheet lines up. Print duplex, flip on long edge, scale 100%.");
process.exit(failed ? 1 : 0);
