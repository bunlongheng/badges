import type { CSSProperties } from "react";

const blob = (extra: CSSProperties): CSSProperties => ({
  position: "absolute",
  borderRadius: "9999px",
  filter: "blur(70px)",
  willChange: "transform",
  ...extra,
});

/** Animated aurora + grid backdrop for the landing. Pure CSS, self-contained. */
export function Aurora() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#fbfaff 0%,#f2f0fc 55%,#eae7fb 100%)" }}
    >
      <div
        style={blob({
          width: "48vw",
          height: "48vw",
          top: "-12%",
          left: "-8%",
          background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.5), transparent 62%)",
          animation: "aurora-a 18s ease-in-out infinite",
        })}
      />
      <div
        style={blob({
          width: "42vw",
          height: "42vw",
          top: "-6%",
          right: "-6%",
          background: "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.45), transparent 62%)",
          animation: "aurora-b 22s ease-in-out infinite",
        })}
      />
      <div
        style={blob({
          width: "46vw",
          height: "46vw",
          bottom: "-16%",
          left: "18%",
          background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.4), transparent 62%)",
          animation: "aurora-c 20s ease-in-out infinite",
        })}
      />
      <div
        style={blob({
          width: "34vw",
          height: "34vw",
          bottom: "-10%",
          right: "8%",
          background: "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.32), transparent 62%)",
          animation: "aurora-a 26s ease-in-out infinite reverse",
        })}
      />
      {/* faint tech grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)",
        }}
      />
    </div>
  );
}
