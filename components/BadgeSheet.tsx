import type { CSSProperties } from "react";
import type { BadgeImage } from "@/lib/useImages";
import type { SheetLayout } from "@/lib/layout";
import type { Settings } from "@/lib/presets";

const KIDS_COLORS = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#c780fa", "#ff9f45"];

function cellRadius(size: number, shape: Settings["shape"]): string {
  if (shape === "circle") return "50%";
  if (shape === "rounded") return `${(size * 0.12).toFixed(3)}in`;
  return "0";
}

function frameStyle(
  index: number,
  size: number,
  settings: Settings
): CSSProperties {
  const radius = cellRadius(size, settings.shape);
  const base: CSSProperties = {
    width: `${size}in`,
    height: `${size}in`,
    borderRadius: radius,
    overflow: "hidden",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
  };

  if (settings.style === "kids") {
    return {
      ...base,
      border: `0.03in solid ${KIDS_COLORS[index % KIDS_COLORS.length]}`,
      boxShadow: "0 0.02in 0.05in rgba(0,0,0,0.12)",
    };
  }
  if (settings.style === "neon") {
    return {
      ...base,
      background: "#0d0d0d",
      border: "0.02in solid #00ffcc",
      boxShadow: "0 0 0.08in rgba(0,255,204,0.55)",
    };
  }
  return base;
}

export function BadgeSheet({
  page,
  pageIndex,
  images,
  layout,
  settings,
  scale,
}: {
  page: number[];
  pageIndex: number;
  images: BadgeImage[];
  layout: SheetLayout;
  settings: Settings;
  scale: number;
}) {
  const wrapStyle: CSSProperties = {
    width: layout.paperW * 96 * scale,
    height: layout.paperH * 96 * scale,
  };

  const sheetStyle: CSSProperties = {
    width: `${layout.paperW}in`,
    height: `${layout.paperH}in`,
    background: "#ffffff",
    padding: `${settings.marginIn}in`,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: `repeat(${layout.columns}, ${settings.sizeIn}in)`,
    gridAutoRows: `${settings.sizeIn}in`,
    gap: `${settings.gapIn}in`,
    justifyContent: "center",
    alignContent: "start",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  };

  return (
    <div className="sheet-wrap" style={wrapStyle} aria-label={`Page ${pageIndex + 1}`}>
      <div className="sheet" style={sheetStyle}>
        {page.map((imgIdx, i) => {
          const img = images[imgIdx];
          const guide: CSSProperties = settings.cutGuides
            ? { outline: "0.01in dashed #c9c9c9", outlineOffset: "-0.005in" }
            : {};
          return (
            <div key={i} style={{ ...frameStyle(i, settings.sizeIn, settings), ...guide }}>
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: settings.fit,
                    display: "block",
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
