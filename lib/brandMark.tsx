import type { CSSProperties } from "react";

/**
 * Satori-compatible (next/og) badge mark: rounded gradient tile with a
 * concentric white/brand button and a highlight dot. Used for every icon size.
 */
export function BrandMark({ size, radius }: { size: number; radius: number }) {
  const box = (extra: CSSProperties): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...extra,
  });

  return (
    <div
      style={box({
        width: size,
        height: size,
        borderRadius: radius,
        background: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
      })}
    >
      <div
        style={box({
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size,
          background: "#ffffff",
          position: "relative",
        })}
      >
        <div
          style={box({
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size,
            background: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
          })}
        >
          <div
            style={{
              position: "absolute",
              top: size * 0.24,
              left: size * 0.24,
              width: size * 0.1,
              height: size * 0.1,
              borderRadius: size,
              background: "rgba(255,255,255,0.9)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
