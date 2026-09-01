"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { BadgeImage } from "@/lib/useImages";
import type { SheetLayout } from "@/lib/layout";
import type { Settings } from "@/lib/presets";
import { extractName } from "@/lib/text";

function cellRadius(size: number, shape: Settings["shape"]): string {
  if (shape === "circle") return "50%";
  if (shape === "rounded") return `${(size * 0.12).toFixed(3)}in`;
  return "0"; // square + original are un-rounded
}

function frameStyle(w: number, h: number): CSSProperties {
  // The grid cell is the TRUE badge size. It does NOT clip, so the dashed cut
  // guide can extend 5% beyond it into the gap. The image gets its own clip layer.
  return {
    width: `${w}in`,
    height: `${h}in`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
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

  // Cell geometry: square grid has cellW === cellH === sizeIn; Extra Large bands
  // are rectangular (full page width x page-height/bands).
  const cw = layout.cellW;
  const ch = layout.cellH;
  // Extra Large bands: inset the badge inside its band so the shape AND its cut
  // guide/name stay WITHIN the band's third - they must never cross the cut line.
  // Height is the constraint (width can use the full band).
  const bandMode = settings.bands > 0;
  const boxH0 = bandMode ? ch * 0.86 : ch;
  // The visible badge within the cell: "original" keeps the image's own shape and
  // fills the band width; square/circle are a centred square sized by height.
  const isOriginal = settings.shape === "original";
  const boxW = isOriginal ? cw : Math.min(cw, boxH0);
  const boxH = isOriginal ? boxH0 : Math.min(cw, boxH0);
  const boxMin = Math.min(boxW, boxH);

  const cellPx = ch * 96 * scale;
  const canPan = settings.fit === "cover" && !isOriginal && !!onSetOffset;

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

  // Rows actually needed for THIS page, so leftover space becomes even gaps
  // (each image gets equal "land") instead of an empty band at the bottom.
  const usedRows = Math.max(1, Math.ceil(page.length / layout.columns));

  // Ruler + grid (screen only) to prove the badges are true physical size.
  const R = 24; // ruler thickness in px
  const isCm = settings.rulerUnit === "cm";
  const unitPx = (isCm ? 96 / 2.54 : 96) * scale; // px per unit on screen
  const labelEvery = isCm ? 5 : 1; // avoid crowding cm labels
  const countW = Math.floor(layout.paperW * (isCm ? 2.54 : 1));
  const countH = Math.floor(layout.paperH * (isCm ? 2.54 : 1));
  const hTicks = Array.from({ length: countW + 1 }, (_, c) => c);
  const vTicks = Array.from({ length: countH + 1 }, (_, c) => c);

  // Only a SPARSE page (fewer badges than one full row) packs top-left, so a
  // lone leftover badge lands where #1 would instead of floating in the middle.
  // Pages with one or more full rows spread evenly to fill the whole sheet.
  const partialPage = page.length < layout.columns;

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
    gridTemplateColumns: `repeat(${layout.columns}, ${cw}in)`,
    gridTemplateRows: `repeat(${usedRows}, ${ch}in)`,
    gap: 0,
    justifyContent: partialPage ? "start" : "space-evenly",
    alignContent: partialPage ? "start" : "space-evenly",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  };

  const radius = cellRadius(boxMin, settings.shape);

  // On a circle badge a square logo's corners fall outside the circle. In Fit
  // mode, inscribe the image in the circle (largest square that fits) so the
  // whole logo always shows. Fill still covers/crops. This stacks on user padding.
  const inscribePct =
    settings.shape === "circle" && settings.fit === "contain"
      ? ((1 - 1 / Math.SQRT2) / 2) * 100 // ~14.64% per side
      : 0;
  const totalPadPct = (settings.padding ? settings.paddingPct : 0) + inscribePct;

  // Straight cut-line positions (gap centers) - identical math to the PDF export,
  // so the preview is an honest picture of how the sheet actually cuts.
  // Partial pages pack top-left (badges touch), so cut lines sit at the badge
  // boundaries instead of spread gap-centers.
  const gcx = partialPage
    ? 0
    : Math.max(
        0,
        (layout.paperW - layout.marginIn * 2 - layout.columns * cw) / (layout.columns + 1)
      );
  const gcy = partialPage
    ? 0
    : Math.max(
        0,
        (layout.paperH - layout.marginIn * 2 - usedRows * ch) / (usedRows + 1)
      );
  const cutXs = Array.from(
    { length: layout.columns + 1 },
    (_, k) => layout.marginIn + gcx / 2 + k * (cw + gcx)
  );
  const cutYs = Array.from(
    { length: usedRows + 1 },
    (_, k) => layout.marginIn + gcy / 2 + k * (ch + gcy)
  );

  return (
    <div
      style={{
        position: "relative",
        paddingTop: settings.showGrid ? R : 0,
        paddingLeft: settings.showGrid ? R : 0,
      }}
      aria-label={`Page ${pageIndex + 1}`}
    >
      {settings.showGrid && (
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
          const borderColor =
            settings.border === "black"
              ? "#000000"
              : settings.border === "auto"
                ? img?.color ?? "#000000"
                : undefined;
          return (
            <div
              key={i}
              className={img ? "badge-cell" : undefined}
              onPointerDown={img ? (e) => onDown(e, img) : undefined}
              onPointerMove={onMove}
              onPointerUp={onUp}
              style={{
                ...frameStyle(cw, ch),
                cursor: canPan && img ? (active ? "grabbing" : "grab") : "default",
                touchAction: canPan ? "none" : undefined,
              }}
            >
             {/* Badge box: the visible badge, centred in the (possibly wide) cell.
                 Square/circle are a centred square; "original" fills the whole cell. */}
             <div style={{ position: "relative", width: `${boxW}in`, height: `${boxH}in` }}>
              {/* Photo, clipped to the TRUE badge shape - it fills only up to the border.
                  Padding insets the artwork so tall crests get breathing room and
                  don't run into the cut edge. */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: radius,
                  overflow: "hidden",
                  background: "#ffffff",
                  padding: totalPadPct ? `${(boxMin * totalPadPct) / 100}in` : 0,
                  boxSizing: "border-box",
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
                      // Only in Fill (cover) do we clip the image to the badge shape
                      // so a filled circle stays circular. In Fit (contain) the whole
                      // logo must show - clipping here would chop corner artwork.
                      borderRadius: settings.fit === "cover" ? radius : undefined,
                    }}
                  />
                ) : null}
              </div>

              {/* Border = the true badge edge (e.g. 4.85 cm). Photo fills up to under it. */}
              {borderColor && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: radius,
                    border: `0.015in solid ${borderColor}`,
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Extracted name: straight, bold, horizontal - easy for kids to read. */}
              {settings.showNames && img && extractName(img.name) && (
                <svg
                  viewBox="0 0 100 100"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    overflow: "visible",
                    pointerEvents: "none",
                  }}
                >
                  <text
                    x={50}
                    y={92}
                    textAnchor="middle"
                    fill="#000000"
                    stroke="#ffffff"
                    strokeWidth={settings.nameSize * 0.18}
                    paintOrder="stroke"
                    fontSize={settings.nameSize}
                    fontWeight={800}
                    style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                  >
                    {extractName(img.name)}
                  </text>
                </svg>
              )}

              {/* Cut guide: dashed line 5% BIGGER, sitting outside the border as a buffer. */}
              {settings.cutGuides && (
                <div
                  style={{
                    position: "absolute",
                    inset: `-${(boxMin * 0.025).toFixed(3)}in`,
                    borderRadius: radius,
                    border: "0.012in dashed #000000",
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
            </div>
          );
        })}

        {/* Straight cut lines (guillotine grid) - same as the PDF, so the preview
            is honest: dashed ring per badge PLUS the real straight cut lines. */}
        {settings.cutGuides && (
          <svg
            viewBox={`0 0 ${layout.paperW} ${layout.paperH}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: `${layout.paperW}in`,
              height: `${layout.paperH}in`,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {cutXs.map((x, k) => (
              <line
                key={"cx" + k}
                x1={x}
                y1={cutYs[0]}
                x2={x}
                y2={cutYs[cutYs.length - 1]}
                stroke="#000000"
                strokeWidth={0.012}
              />
            ))}
            {cutYs.map((y, k) => (
              <line
                key={"cy" + k}
                x1={cutXs[0]}
                y1={y}
                x2={cutXs[cutXs.length - 1]}
                y2={y}
                stroke="#000000"
                strokeWidth={0.012}
              />
            ))}
          </svg>
        )}

        {/* Stats caption printed at the bottom of the sheet itself - a white
            pill with padding so it's never clipped or crowded by the last row. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${Math.max(0.06, layout.marginIn * 0.35)}in`,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              background: "#ffffff",
              padding: "0.03in 0.12in",
              borderRadius: "0.06in",
              textAlign: "center",
              font: "500 0.085in ui-sans-serif, system-ui, sans-serif",
              color: "#9aa0a6",
              letterSpacing: "0.005in",
              whiteSpace: "nowrap",
            }}
          >
            {caption} · Page {pageIndex + 1} of {totalPages}
          </span>
        </div>
      </div>

      {settings.showGrid && (
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
