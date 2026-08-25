import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType },
    { id: "512", size: { width: 512, height: 512 }, contentType },
  ];
}

export default function Icon({ id }: { id: string }) {
  const dim = id === "512" ? 512 : 192;
  return new ImageResponse(<BrandMark size={dim} radius={dim * 0.23} />, {
    width: dim,
    height: dim,
  });
}
