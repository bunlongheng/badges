# Badges

Turn your photos into print-ready badge, button, and sticker sheets - drop images, auto-fit a grid, export a print-ready PDF. Everything runs in your browser; nothing is ever uploaded.

![Badges landing](docs/screenshots/hero.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![Tests](https://img.shields.io/badge/tests-25%20passing-brightgreen)

**Live:** https://badges-bheng.vercel.app

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Project layout](#project-layout)
- [License](#license)

## Features

- **iPhone HEIC/HEVC support** - drop photos straight from an iPhone; they are decoded in-browser via libheif WebAssembly (no upload)
- **Drop / paste (⌘V) / drag anywhere** to add images, with a live "N images incoming" overlay
- **Two real badge sizes** - Small (4.75 cm / 1.87") and Large (6.8 cm / 2.68") diameters
- **Auto-fit layout** - packs the most badges per page inside a safe printable border (no manual columns/gaps)
- **Square or circle** shapes; plain, kids, or neon styles
- **Drag a badge to reframe** its focal point so faces are never cropped out
- **Drag to reorder** across pages; **duplicate photos are skipped** by content hash
- **True-size ruler & 1-unit grid** (click to toggle inches/cm) plus black cut guides
- **Export** - an email-friendly, print-DPI PDF drawn per badge (size-prefixed filename), or native print
- **Privacy-first** - all processing happens in the browser; no server, no upload

![Badge studio](docs/screenshots/studio.png)

## Architecture

A single-page client app. Images become in-browser object URLs (HEIC converted
first); a pure layout module auto-computes the safe-fit grid and paginates; the
preview renders each page as a real-inch CSS sheet, and export draws each badge
straight to a canvas placed at exact inch coordinates in the PDF.

```mermaid
flowchart LR
    A[Drop / paste / drag] --> B[useImages<br/>HEIC to JPEG, hash dedupe]
    B --> C[computeLayout<br/>auto safe-fit grid]
    C --> D[BadgeSheet<br/>real-inch CSS + ruler]
    D --> E[PDF export<br/>canvas to jsPDF]
    D --> F[Native print<br/>@media print]
    G[Controls] --> H[useSettings<br/>localStorage]
    H --> C
```

| Layer | Responsibility | Key files |
| --- | --- | --- |
| Layout math | Auto safe margin, fit + paginate | `lib/layout.ts`, `lib/presets.ts` |
| State | Images (HEIC + dedupe), settings | `lib/useImages.ts`, `lib/useSettings.ts` |
| UI | Landing, controls, tray, sheet | `components/*` |
| Export | Draw each badge to a PDF page | `lib/pdf.ts` |

## How it works

`autoSafeMargin` finds the most generous margin (at least a printer-safe minimum)
that still fits the maximum badges, so the grid centers with an even safe border.
`computeLayout` then derives the columns and rows that fit the chosen diameter,
and `buildPages` flows the photos across pages. Each page renders as a `.sheet`
sized in real inches (so `@media print` prints at true size), and the PDF exporter
draws every badge onto a canvas - cropped to its shape with its focal offset - and
places it at exact inch coordinates, keeping the file email-friendly and sharp.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4
- [heic-to](https://github.com/hoppergee/heic-to) (libheif WebAssembly) for iPhone HEIC
- [jsPDF](https://github.com/parallax/jsPDF) + HTML5 Canvas for the PDF export
- `next/og` for the generated favicon, apple-touch icon, and OG share image
- Vitest + Testing Library
- Deployed on Vercel

## Quick start

```bash
git clone https://github.com/bunlongheng/badges.git
cd badges
npm install
npm run dev
```

Open http://localhost:3007 and drop in some photos (or click "try an example").

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run the unit + component tests |
| `npm run typecheck` | TypeScript type-check |
| `npm run lint` | ESLint |

## Configuration

No environment variables required. The app is fully client-side and stores your
grid settings in `localStorage`.

## Project layout

```
app/                 # App Router: landing, sign-in, icons, manifest, OG image
  page.tsx           # the studio (landing, controls, live preview, export)
  signin/            # branded local-first welcome page
  icon.png           # favicon  ·  apple-icon.png  ·  manifest.ts  ·  opengraph-image.tsx
components/           # Aurora, DropZone, Controls, ImageTray, BadgeSheet, Header
lib/                  # layout math, presets, PDF export, hooks (images/settings)
public/samples/       # bundled example photos ("try an example")
test/                 # Vitest unit + component tests
reference/            # the original standalone HTML prototypes (source material)
docs/screenshots/     # README images
```

## License

[MIT](LICENSE) (c) Bunlong Heng
