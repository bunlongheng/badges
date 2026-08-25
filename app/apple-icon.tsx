import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // Apple icons render on a solid tile (no transparency), full-bleed rounding by iOS.
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 180,
          height: 180,
          background: "#ffffff",
        }}
      >
        <BrandMark size={156} radius={36} />
      </div>
    ),
    { ...size }
  );
}
