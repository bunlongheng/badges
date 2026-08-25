import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Badges - Print-Ready Badge Sheets",
    short_name: "Badges",
    description:
      "Fast, privacy-first badge & sticker sheet generator. Drop images, arrange on a printable grid, export a print-ready PDF.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#4f46e5",
    orientation: "portrait",
    categories: ["productivity", "utilities", "photo"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
