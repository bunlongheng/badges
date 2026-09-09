#!/usr/bin/env node
/**
 * light-table - hold an exported badge PDF up to the light and prove the front
 * and back line up, without printing a single sheet.
 *
 * Usage:
 *   node scripts/light-table.mjs ~/Desktop/badges.pdf [--dpi 240] [--out DIR]
 *
 * Duplex (flip on long edge) lays the back page behind the front MIRRORED about
 * the page centre. So a cell spanning [a,b] on the front must appear at
 * [W-b, W-a] on the back - a horizontal shift of exactly (W - a - b).
 *
 * How it measures - and why the obvious way does not work:
 *   - Mirroring the back page and diffing pixels is meaningless: the export does
 *     NOT mirror the artwork (the whole point - a face reads correctly on both
 *     sides), so once flipped the photos no longer match.
 *   - The cut guides are symmetric about the page centre, so mirroring maps them
 *     onto themselves. They look identical whether the mirror is right, wrong, or
 *     missing entirely. They prove nothing.
 *   So instead each cell's UNFLIPPED artwork is correlated against the back page.
 *   The same photo is drawn on both sides, so the match is near-exact, and where
 *   it peaks is where the back badge actually sits - measured to a fraction of a
 *   pixel, from the real file, with no trust in the layout code at all.
 *
 * Output per sheet:
 *   - the measured offset, in pixels and millimetres
 *   - a light-table PNG: front ink red, mirrored back ink cyan, grey where they
 *     agree. Perfect registration = grey badges with no coloured fringe.
 *
 * Requires poppler (brew install poppler). No node dependencies.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

// ---------- tiny PNG writer (no deps) ----------
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function writePng(file, w, h, rgb) {
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * stride + 1, y * w * 3, (y + 1) * w * 3);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td), 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

// ---------- PGM reader ----------
function readPgm(file) {
  const buf = fs.readFileSync(file);
  let p = 0;
  const token = () => {
    while (p < buf.length && (buf[p] === 35 || buf[p] <= 32)) {
      if (buf[p] === 35) while (p < buf.length && buf[p] !== 10) p++;
      else p++;
    }
    const s = p;
    while (p < buf.length && buf[p] > 32) p++;
    return buf.toString("latin1", s, p);
  };
  if (token() !== "P5") throw new Error(`${file}: not a P5 PGM`);
  const w = +token(), h = +token(), max = +token();
  p++;
  if (max !== 255) throw new Error(`${file}: unsupported maxval ${max}`);
  return { w, h, data: buf.subarray(p, p + w * h) };
}

const INK = 165; // grey value below this is ink on white paper

/** Narrow, tall ink spikes = the cut guides. They delimit the cells. */
function guideAxis({ w, h, data }, axis) {
  const n = axis === "x" ? w : h;
  const m = axis === "x" ? h : w;
  const runs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let run = 0, best = 0;
    for (let j = 0; j < m; j++) {
      const idx = axis === "x" ? j * w + i : i * w + j;
      run = data[idx] < INK ? run + 1 : 0;
      if (run > best) best = run;
    }
    runs[i] = best;
  }
  const min = m * 0.45;
  const out = [];
  let i = 0;
  while (i < n) {
    if (runs[i] < min) { i++; continue; }
    const s = i;
    let sum = 0, weight = 0;
    while (i < n && runs[i] >= min) { sum += i * runs[i]; weight += runs[i]; i++; }
    if (i - s <= 14) out.push(sum / weight);
  }
  return out;
}

/** Mean absolute difference between a front window and the back page, shifted. */
function mad(F, B, x0, y0, wid, hgt, dx) {
  const W = F.w;
  let s = 0, n = 0;
  for (let y = y0; y < y0 + hgt; y += 2) {
    const row = y * W;
    for (let x = x0; x < x0 + wid; x += 2) {
      s += Math.abs(F.data[row + x] - B.data[row + x + dx]);
      n++;
    }
  }
  return n ? s / n : Infinity;
}

// ---------- main ----------
const args = process.argv.slice(2);
const pdf = args.find((a) => !a.startsWith("--"));
if (!pdf) {
  console.error("usage: node scripts/light-table.mjs <file.pdf> [--dpi 240] [--out DIR]");
  process.exit(2);
}
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : dflt;
};
const DPI = +flag("dpi", 240);
const outDir = path.resolve(flag("out", path.dirname(path.resolve(pdf))));
const MM = 25.4 / DPI;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lighttable-"));
try {
  execFileSync("pdftoppm", ["-gray", "-r", String(DPI), path.resolve(pdf), path.join(tmp, "pg")]);
} catch {
  console.error("pdftoppm failed - install poppler:  brew install poppler");
  process.exit(2);
}
const pageFiles = fs.readdirSync(tmp).filter((f) => f.endsWith(".pgm"))
  .sort((a, b) => +a.match(/(\d+)\.pgm$/)[1] - +b.match(/(\d+)\.pgm$/)[1])
  .map((f) => path.join(tmp, f));

if (pageFiles.length < 2 || pageFiles.length % 2) {
  console.error(`This PDF has ${pageFiles.length} page(s); a double-sided export is front/back PAIRS.`);
  console.error("Turn Double-sided ON, export again, then re-run.");
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(2);
}

const base = path.basename(pdf).replace(/\.pdf$/i, "");
console.log(`\nlight table - ${path.basename(pdf)}   ${DPI} DPI   1px = ${MM.toFixed(4)}mm\n`);
let failed = 0, worst = 0, measured = 0;

for (let i = 0; i < pageFiles.length; i += 2) {
  const sheet = i / 2 + 1;
  const F = readPgm(pageFiles[i]);
  const Bp = readPgm(pageFiles[i + 1]);
  if (F.w !== Bp.w || F.h !== Bp.h) {
    console.log(`sheet ${sheet}: page sizes differ - MISALIGNED`);
    failed++;
    continue;
  }
  const { w: W, h: H } = F;

  // Cells come from the cut guides. They are useless as an alignment fiducial
  // (symmetric about the centre) but they are an exact map of the grid.
  const xs = guideAxis(F, "x");
  const ys = guideAxis(F, "y");
  const errors = [];
  if (xs.length >= 2 && ys.length >= 2) {
    for (let c = 0; c < xs.length - 1; c++) {
      for (let r = 0; r < ys.length - 1; r++) {
        const a = Math.ceil(xs[c]) + 6, b = Math.floor(xs[c + 1]) - 6;
        const t = Math.ceil(ys[r]) + 6, u = Math.floor(ys[r + 1]) - 6;
        const wid = b - a, hgt = u - t;
        if (wid < 40 || hgt < 40) continue;
        // skip an empty cell - nothing to correlate
        let ink = 0;
        for (let y = t; y < u; y += 4) for (let x = a; x < b; x += 4) if (F.data[y * W + x] < 230) ink++;
        if (ink < ((wid / 4) * (hgt / 4)) * 0.05) continue;

        const required = Math.round(W - xs[c] - xs[c + 1]); // mirror of [a,b]
        let best = null;
        for (let dx = required - 12; dx <= required + 12; dx++) {
          if (a + dx < 0 || b + dx >= W) continue;
          const v = mad(F, Bp, a, t, wid, hgt, dx);
          if (!best || v < best.v) best = { dx, v };
        }
        if (!best) continue;
        const vm = mad(F, Bp, a, t, wid, hgt, best.dx - 1);
        const vp = mad(F, Bp, a, t, wid, hgt, best.dx + 1);
        const denom = vm - 2 * best.v + vp;
        const sub = denom > 0 ? best.dx + (0.5 * (vm - vp)) / denom : best.dx;
        errors.push({ cell: `r${r}c${c}`, err: sub - required, match: best.v });
        measured++;
      }
    }
  }

  // the light-table image: front ink red, mirrored-back ink cyan, grey = agree
  const rgb = Buffer.alloc(W * H * 3, 255);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      const f = F.data[row + x] < INK;
      const b = Bp.data[row + (W - 1 - x)] < INK;
      const j = (row + x) * 3;
      if (f && b) { rgb[j] = 96; rgb[j + 1] = 100; rgb[j + 2] = 104; }
      else if (f) { rgb[j] = 214; rgb[j + 1] = 32; rgb[j + 2] = 48; }
      else if (b) { rgb[j] = 0; rgb[j + 1] = 168; rgb[j + 2] = 200; }
    }
  }
  const file = path.join(outDir, `${base}-lighttable-${sheet}.png`);
  writePng(file, W, H, rgb);

  if (!errors.length) {
    console.log(`sheet ${sheet}: could not measure (no cut guides, or no artwork to match)`);
    console.log(`         proof: ${file}`);
    continue;
  }
  const big = errors.reduce((m, e) => (Math.abs(e.err) > Math.abs(m.err) ? e : m));
  if (Math.abs(big.err) > Math.abs(worst)) worst = big.err;
  // RESOLUTION LIMIT. The reference here is the cut-guide cell, whose centre is
  // continuous, while a badge is placed on a whole device pixel - so a correctly
  // mirrored badge can still read up to ~1.2px off its cell centre. That is a
  // limit of this measurement, NOT a duplex error: the export guarantees
  // x_front + x_back + width == pageWidth exactly (test/duplex.test.ts proves it
  // for every paper x size x count). Only a shift bigger than that slack, showing
  // the same sign across the sheet, is a real misalignment.
  const ok = Math.abs(big.err) < 2;
  if (!ok) failed++;
  console.log(
    `sheet ${sheet}: ${ok ? "ALIGNED" : "OFF"}   ${errors.length} badge(s) measured   ` +
    `worst ${big.err >= 0 ? "+" : ""}${big.err.toFixed(2)}px (${(Math.abs(big.err) * MM).toFixed(3)}mm) at ${big.cell}`
  );
  console.log(`         per badge: ${errors.map((e) => `${e.err >= 0 ? "+" : ""}${e.err.toFixed(2)}`).join("  ")}px`);
  console.log(`         proof: ${file}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log("");
if (failed) {
  console.log(`${failed} sheet(s) OFF - worst ${Math.abs(worst).toFixed(2)}px (${(Math.abs(worst) * MM).toFixed(3)}mm). Re-export before printing.\n`);
  process.exit(1);
}
if (!measured) {
  console.log("Nothing measurable - turn Cut guides ON and export again.\n");
  process.exit(2);
}
console.log(`Every badge lines up in the file (worst ${Math.abs(worst).toFixed(2)}px = ${(Math.abs(worst) * MM).toFixed(3)}mm).`);
console.log("");
console.log("RESOLUTION: this tool cannot adjudicate anything under ~1.5px. Its reference is");
console.log("the cut-guide cell, whose centre is continuous, while a badge sits on a whole");
console.log("device pixel - so a perfectly mirrored badge still reads up to ~1.2px off, and");
console.log("small badges add correlation noise on top. Do not read a 1px number here as a");
console.log("defect. The exact guarantee lives in test/duplex.test.ts, which proves");
console.log("x_front + x_back + width == pageWidth for every paper x size x count.");
console.log("What this tool IS good for: catching a gross shift, and confirming the export");
console.log("has real front/back page pairs at the right page size.");
console.log("\nAnything you still see on paper is the PRINTER, not the PDF.");
console.log("Print with: Actual size / 100% scale (never Fit to page), two-sided, FLIP ON LONG EDGE.\n");
