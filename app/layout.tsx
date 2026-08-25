import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const APP_NAME = "Badges";
const APP_DESC =
  "Fast, privacy-first badge & sticker sheet generator. Drop images, arrange on a printable grid, export a print-ready PDF. Nothing ever leaves your browser.";

export const metadata: Metadata = {
  metadataBase: new URL("https://badges-bheng.vercel.app"),
  title: {
    default: `${APP_NAME} - Print-Ready Badge Sheets`,
    template: `%s - ${APP_NAME}`,
  },
  description: APP_DESC,
  applicationName: APP_NAME,
  keywords: [
    "badges",
    "buttons",
    "stickers",
    "print sheet",
    "pdf generator",
    "2.125 inch buttons",
    "circle badges",
  ],
  authors: [{ name: "Bunlong Heng", url: "https://bunlongheng.com" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  openGraph: {
    type: "website",
    title: `${APP_NAME} - Print-Ready Badge Sheets`,
    description: APP_DESC,
    url: "https://badges-bheng.vercel.app",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} - Print-Ready Badge Sheets`,
    description: APP_DESC,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
