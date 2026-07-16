# Elegant Markdown to PDF — AI Assistant Guide

Technical context and development notes for AI assistants working on this project.

## Project Overview
A Markdown to PDF converter built on Node.js, Express, and `md-to-pdf` (which drives Puppeteer/Chromium). It exposes a web writing station plus command-line and watch-mode conversion.

## Tech Stack
- **Backend**: Node.js (CommonJS), Express 5, `md-to-pdf` 5.x.
- **Frontend**: Vanilla JS + CodeMirror 5 (editor) and Marked (web preview). KaTeX and Mermaid are loaded in `index.html` but are NOT currently invoked in the preview or PDF pipeline.
- **Styling**: `style.css` is injected into the generated PDF; `public/ui.css` styles the web app.

## Entry Points
- `server.js` — Express server (default port 3000, override with `PORT`). Serves `public/` statically, plus `/images`. This is the `npm start` / Docker entry.
- `convert.js` — Core conversion module (`convert(input, options)`), also runnable as a CLI (`node convert.js [file.md]`, the `mark-pdf` bin, or `npm run convert`). Writes `<name>.pdf` next to the source.
- `watch.js` — `npm run watch [file.md]`; re-runs `convert()` when the target file, `style.css`, or `config.js` change (debounced 200ms).

## Core Conversion Logic (`convert.js`)
1. `input` is treated as a file path only if it is a string ending in `.md` that exists on disk; otherwise it is treated as raw Markdown content (the web path).
2. Config is layered: built-in defaults → `config.js` (deep-merged) → caller `options` (deep-merged).
3. Dynamic CSS is injected to control `page-break-before` for H1/H2/H3 based on `pagination` flags.
4. `pdf_options` (format, margins, header/footer templates) are assembled. Header/footer templates must be wrapped in a `<div>` with an explicit `font-size` for Puppeteer to render them.
5. `dest` handling is important: for a **file** input, `dest` is `<source>.pdf` so md-to-pdf writes the file; for **raw content**, `dest` is `null` so md-to-pdf does NOT fall back to `'stdout'` (which would dump raw PDF bytes into the server log). The web server consumes the returned `pdf.content` buffer instead.

## Web Request Flow
1. `public/app.js`: CodeMirror `change` → `triggerAutoUpdate` → debounced (500ms) `updatePreview`.
2. Content is persisted to `localStorage` under `md_docs`.
3. `{title}`, `{date}`, `{time}` are substituted on the frontend before the config is POSTed.
4. `POST /api/convert` → `convert()` → PDF buffer streamed back; the iframe is hard-reloaded (`about:blank` → Blob URL) to bypass caching.
5. `POST /api/upload` saves base64 images into `images/`. Filenames are reduced with `path.basename` to prevent path traversal.

## Security Notes
- `mergeConfig` skips `__proto__` / `constructor` / `prototype` keys to prevent prototype pollution from request bodies.
- `/api/upload` strips directory components from `fileName`; keep this guard if you touch the upload path.
- The upload endpoint has no auth and no content-type/size validation beyond the 10mb body-parser limit — acceptable for local/trusted use, revisit before exposing publicly.

## Known Unused / Dead Config
- `config.js` `appearance` and `features` blocks, plus the `header_footer` keys `header_title`/`header_author`/`show_copyright`/`copyright_text`/`show_page_numbers`, are NOT read by `convert.js` (which uses `header_left`/`header_right`/`footer_left`/`footer_right`). Treat these as documentation stubs, not active settings.
- `options.customCss` is honored by `convert()` but nothing currently sends it.

## Guidelines for AI
- **Keep it in English**: all code comments, strings, README, and this file must be English (this repo is intended to be open-source-friendly).
- **PDF concurrency**: respect the `isUpdating` / `needsUpdate` flags in `app.js` to avoid overlapping PDF requests.
- **Images**: reference local images with `./images/...` relative paths in Markdown.
- **Don't reintroduce the stdout dump**: never call `mdToPdf` with raw content and an undefined `dest`.
