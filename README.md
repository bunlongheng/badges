# Badges

Fast, privacy-first **badge & sticker sheet generator**. Drop or paste any
images, pick a size and grid, and export a print-ready PDF - or print straight
from the browser. Buttons, name tags, party favors, stickers. Everything stays
100% on your device; nothing is ever uploaded.

**Live:** https://badges-bheng.vercel.app

## Features

- **Drop, paste (⌘V), or upload** any number of images
- **Presets** for 1", 1.5", 2", 2.125" (classic button), 2.5", 3" + a custom size slider
- **Shapes:** square, rounded, or circle overlay
- **Styles:** plain, kids (colorful frames), neon
- **Grid control:** columns, gap, and page margin, with automatic row fitting
- **Paper sizes:** US Letter, A4, Legal
- **Repeat-to-fill** a page from a few images (print multiple copies)
- **Cut guides** for trimming
- **Export:** high-resolution PDF or native browser print
- **Reorder / remove** individual images
- **Light & dark mode**, settings persisted locally
- **Privacy-first:** all processing happens in the browser - no server, no upload

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com) for PDF export
- Vitest + Testing Library for tests

## Getting started

```bash
npm install
npm run dev        # http://localhost:3007
```

### Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start the dev server (port 3007)   |
| `npm run build`     | Production build                   |
| `npm start`         | Serve the production build         |
| `npm test`          | Run the unit + component tests     |
| `npm run typecheck` | TypeScript type-check              |
| `npm run lint`      | ESLint                             |

## How it works

Images are held as in-browser object URLs and laid out on a real-inch CSS grid
sized to the chosen paper. The layout math (`lib/layout.ts`) computes how many
badges fit per row/column and paginates. Export rasterizes each page at ~240 DPI
and places it on a PDF page matching the paper dimensions; printing uses native
`@media print` rules so the sheet prints at true size.

## License

[MIT](./LICENSE) - Bunlong Heng
