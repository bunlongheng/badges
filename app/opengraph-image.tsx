import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Badges - print-ready badge & sticker sheets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const iconData = await readFile(join(process.cwd(), "public/icon-512.png"));
  const iconSrc = `data:image/png;base64,${iconData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #0b1020 0%, #1e1b4b 60%, #312e81 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={iconSrc} width={104} height={104} alt="" style={{ borderRadius: 24 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Badges</div>
            <div style={{ fontSize: 22, color: "#a5b4fc" }}>badges-bheng.vercel.app</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          Print-ready badge &amp; sticker sheets
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#c7d2fe", maxWidth: 860 }}>
          Drop images, pick a size and grid, export a crisp PDF. 100% in your browser.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {['2.125" buttons', "Circle badges", "Cut guides", "iPhone HEIC"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 22,
                padding: "10px 20px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
