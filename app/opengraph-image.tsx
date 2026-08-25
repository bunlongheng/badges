import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Badges - print-ready badge & sticker sheets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function d(rel: string) {
  const b = await readFile(join(process.cwd(), rel));
  return `data:image/png;base64,${b.toString("base64")}`;
}

export default async function OpengraphImage() {
  const icon = await d("public/og/icon.png");
  const shots = await Promise.all(["s2", "s1", "s6", "s4"].map((s) => d(`public/og/${s}.png`)));

  const badge = (src: string, key: number) => (
    <div
      key={key}
      style={{
        display: "flex",
        width: 214,
        height: 214,
        borderRadius: 9999,
        border: "6px solid #ffffff",
        overflow: "hidden",
      }}
    >
      <img src={src} width={202} height={202} alt="" style={{ objectFit: "cover" }} />
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "linear-gradient(130deg, #0b1020 0%, #241a54 55%, #3b2d99 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 660, padding: "0 64px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={icon} width={64} height={64} alt="" style={{ borderRadius: 16 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>Badges</div>
              <div style={{ fontSize: 18, color: "#a5b4fc" }}>badges-bheng.vercel.app</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 38, fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            <div style={{ display: "flex" }}>Print-ready</div>
            <div style={{ display: "flex" }}>badge sheets</div>
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 25, color: "#c7d2fe", maxWidth: 520 }}>
            Drop photos, auto-fit a grid, export a crisp PDF. All in your browser.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            {["iPhone HEIC", "Circle badges", "True-size ruler"].map((t) => (
              <div key={t} style={{ display: "flex", fontSize: 19, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: 540, gap: 22 }}>
          <div style={{ display: "flex", gap: 22 }}>
            {badge(shots[0], 0)}
            {badge(shots[1], 1)}
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            {badge(shots[2], 2)}
            {badge(shots[3], 3)}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
