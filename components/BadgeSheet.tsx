"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { BadgeImage } from "@/lib/useImages";
import type { SheetLayout } from "@/lib/layout";
import type { Settings } from "@/lib/presets";

const KIDS_COLORS = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#c780fa", "#ff9f45"];

function cellRadius(size: number, shape: Settings["shape"]): string {
  if (shape === "circle") return "50%";
  if (shape === "rounded") return `${(size * 0.12).toFixed(3)}in`;
  return "0";
}

function frameStyle(index: number, size: number, settings: Settings): CSSProperties {
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
  onSetOffset,
  totalPages,
  caption,
  onCycleUnit,
}: {
  page: number[];
  pageIndex: number;
  images: BadgeImage[];
  layout: SheetLayout;
  settings: Settings;
  scale: number;
  onSetOffset?: (id: string, x: number, y: number) => void;
  totalPages: number;
  caption: string;
  onCycleUnit?: () => void;
}) {
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    offX: number;
    offY: number;
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const cellPx = settings.sizeIn * 96 * scale;
  const canPan = settings.fit === "cover" && !!onSetOffset;

  const onDown = (e: PointerEvent<HTMLDivElement>, img: BadgeImage) => {
    if (!canPan) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveId(img.id);
    drag.current = {
      id: img.id,
      startX: e.clientX,
      startY: e.clientY,
      offX: img.offsetX,
      offY: img.offsetY,
    };
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !onSetOffset || cellPx <= 0) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    // Drag the photo: moving right reveals its left edge (offset decreases).
    onSetOffset(
      drag.current.id,
      drag.current.offX - (dx / cellPx) * 100,
      drag.current.offY - (dy / cellPx) * 100
    );
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      drag.current = null;
      setActiveId(null);
    }
  };

  const pxW = layout.paperW * 96 * scale;
  const pxH = layout.paperH * 96 * scale;
  const wrapStyle: CSSProperties = { width: pxW, height: pxH, position: "relative" };

  // Ruler + grid (screen only) to prove the badges are true physical size.
  const R = 24; // ruler thickness in px
  const isCm = settings.rulerUnit === "cm";
  const unitPx = (isCm ? 96 / 2.54 : 96) * scale; // px per unit on screen
  const labelEvery = isCm ? 5 : 1; // avoid crowding cm labels
  const countW = Math.floor(layout.paperW * (isCm ? 2.54 : 1));
  const countH = Math.floor(layout.paperH * (isCm ? 2.54 : 1));
  const hTicks = Array.from({ length: countW + 1 }, (_, c) => c);
  const vTicks = Array.from({ length: countH + 1 }, (_, c) => c);

  const sheetStyle: CSSProperties = {
    width: `${layout.paperW}in`,
    height: `${layout.paperH}in`,
    // Explicit hex color so nothing in this subtree inherits Tailwind's oklch/lab
    // color from <body> - html2canvas (PDF export) cannot parse lab()/oklch().
    color: "#111111",
    background: "#ffffff",
    padding: `${layout.marginIn}in`,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: `repeat(${layout.columns}, ${settings.sizeIn}in)`,
    gridTemplateRows: `repeat(${layout.rows}, ${settings.sizeIn}in)`,
    gap: 0,
    // Spread the badges evenly across the whole safe area (even quadrants), so
    // leftover space becomes even margins instead of empty bottom space.
    justifyContent: "space-evenly",
    alignContent: "space-evenly",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  };

  const radius = cellRadius(settings.sizeIn, settings.shape);

  return (
    <div
      style={{
        position: "relative",
        paddingTop: settings.ruler ? R : 0,
        paddingLeft: settings.ruler ? R : 0,
      }}
      aria-label={`Page ${pageIndex + 1}`}
    >
      {settings.ruler && (
        <>
          <button
            type="button"
            onClick={onCycleUnit}
            title="Click to switch unit"
            className="no-print"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: R,
              height: R,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 600,
              color: "#4f46e5",
              cursor: "pointer",
              background: "transparent",
              border: "none",
            }}
          >
            {settings.rulerUnit}
          </button>
          <div className="no-print" style={{ position: "absolute", top: 0, left: R, width: pxW, height: R }}>
            {hTicks.map((c) => (
              <div key={c} style={{ position: "absolute", left: c * unitPx, bottom: 0 }}>
                <div style={{ width: 1, height: c % labelEvery === 0 ? 11 : 6, background: "#a1a1aa" }} />
                {c % labelEvery === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: 0,
                      transform: "translateX(-50%)",
                      fontSize: 8,
                      color: "#52525b",
                    }}
                  >
                    {c}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="no-print" style={{ position: "absolute", top: R, left: 0, width: R, height: pxH }}>
            {vTicks.map((c) => (
              <div key={c} style={{ position: "absolute", top: c * unitPx, right: 0 }}>
                <div style={{ height: 1, width: c % labelEvery === 0 ? 11 : 6, background: "#a1a1aa" }} />
                {c % labelEvery === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 0,
                      transform: "translateY(-50%)",
                      fontSize: 8,
                      color: "#52525b",
                    }}
                  >
                    {c}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="sheet-wrap" style={wrapStyle}>
        <div className="sheet" style={sheetStyle}>
        {page.map((imgIdx, i) => {
          const img = images[imgIdx];
          const active = !!img && activeId === img.id;
          return (
            <div
              key={i}
              onPointerDown={img ? (e) => onDown(e, img) : undefined}
              onPointerMove={onMove}
              onPointerUp={onUp}
              style={{
                ...frameStyle(i, settings.sizeIn, settings),
                position: "relative",
                cursor: canPan && img ? (active ? "grabbing" : "grab") : "default",
                touchAction: canPan ? "none" : undefined,
              }}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt=""
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: settings.fit,
                    objectPosition: `${img.offsetX}% ${img.offsetY}%`,
                    display: "block",
                    pointerEvents: "none",
                  }}
                />
              ) : null}

              {/* Cut guide - drawn on top so it stays visible over a cover image */}
              {settings.cutGuides && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: radius,
                    border: "0.014in dashed #000000",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Active drag - blue border while repositioning (screen only) */}
              {active && (
                <div
                  className="no-print"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: radius,
                    border: "0.03in solid #2563eb",
                    boxShadow: "0 0 0.06in rgba(37,99,235,0.5)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Stats caption printed at the bottom of the sheet itself */}
        <div
          style={{
            position: "absolute",
            left: `${layout.marginIn}in`,
            right: `${layout.marginIn}in`,
            bottom: `${Math.max(0.12, layout.marginIn * 0.5)}in`,
            textAlign: "center",
            font: "500 0.12in ui-sans-serif, system-ui, sans-serif",
            color: "#9aa0a6",
            letterSpacing: "0.01in",
          }}
        >
          {caption} · Page {pageIndex + 1} of {totalPages}
        </div>
      </div>

      {settings.ruler && (
        <div className="no-print" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {hTicks.slice(1).map((c) => (
            <div
              key={"v" + c}
              style={{ position: "absolute", left: c * unitPx, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.05)" }}
            />
          ))}
          {vTicks.slice(1).map((c) => (
            <div
              key={"h" + c}
              style={{ position: "absolute", top: c * unitPx, left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.05)" }}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
