# KansEditor

KansEditor is a lightweight, mobile-first photo editor built with Next.js App Router and TypeScript. Image processing happens in the browser; photos are not uploaded to a server.

## Features

- Import JPG, PNG, WebP, AVIF and GIF images (40 MB limit).
- Live preview, before/after comparison, zoom, undo and redo.
- Light controls: brightness, exposure, contrast, highlights and shadows.
- Color controls: saturation, vibrance, temperature, tint and hue.
- Effects: blur, sharpen, vignette, grain and fade.
- Crop ratios, rotate, flip and centered zoom crop.
- 12 built-in presets and custom presets saved in browser local storage.
- Export JPG, PNG and WebP; original dimensions, Full HD fit, 2× upscale and custom dimensions up to 8192 px.
- No account, API key, database or image upload endpoint.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Upload this project to a Git repository or import the folder into Vercel.
2. Select the Next.js framework preset.
3. Keep the default build command `npm run build`.
4. Deploy. No environment variables are required.

## Notes

- All editing is client-side using the browser Canvas API. The original image remains on the device.
- The 1080p option fits the edited image inside 1920 × 1080 without stretching it. Portrait images retain their aspect ratio.
- 2× export is capped at 8192 pixels per side to avoid excessive browser memory usage.
- Browser memory limits vary by device. Very large source images may take longer to preview or export, especially on low-memory phones.
