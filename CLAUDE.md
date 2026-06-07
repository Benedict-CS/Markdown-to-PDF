# Elegant Markdown to PDF — AI Assistant Guide

Technical context and development standards for AI assistants (Claude, Gemini, etc.) working on this project.

## Project Overview
A high-performance Markdown to PDF conversion station using Node.js, Express, and `md-to-pdf` (Puppeteer). Optimized for real-time responsiveness and professional document layout.

## Tech Stack
- **Backend**: Node.js (CommonJS), Express, `md-to-pdf`.
- **Frontend**: Vanilla JS, CodeMirror (Editor), Marked.js (Web Preview), KaTeX (Math), Mermaid (Diagrams).
- **Styling**: GitHub-style Markdown base (`style.css`), modern UI (`ui.css`).

## Core Logic Flow
1. **Editor**: CodeMirror triggers `triggerAutoUpdate` on every change.
2. **Persistence**: Content is saved to `localStorage` under `md_docs`.
3. **PDF Generation Pipeline**:
    - **Debounce**: 500ms delay before requesting PDF.
    - **Catch-up Queue**: If a render is in progress, the next one is queued via `needsUpdate` flag.
    - **Variable Replacement**: `{title}`, `{date}`, and `{time}` are replaced on the frontend before sending the config to the API.
    - **Iframe Refresh**: Iframe is hard-reloaded (src set to `about:blank` then to Blob URL) to bypass browser caching.
4. **Backend**: `convert.js` uses `md-to-pdf` with `basedir: __dirname` to resolve images correctly and processes granular header/footer quadrants.

## Critical Files
- `server.js`: API endpoints and static file serving (including `/images`).
- `convert.js`: Core PDF logic with dynamic CSS injection for page breaks.
- `public/app.js`: Master controller for UI, event binding, and preview orchestration.
- `style.css`: Styles applied *inside* the PDF.
- `public/ui.css`: Styles for the web application interface.

## Guidelines for AI
- **Event Binding**: Use explicit `.onclick` or `addEventListener` on the `elements` object or direct ID lookup. Ensure all new settings are added to the listener loop.
- **PDF State**: Always check the `isUpdating` and `needsUpdate` flags to avoid concurrent PDF requests.
- **Pathing**: Use relative paths starting with `./images/` for local images in Markdown.
- **Templates**: Puppeteer header/footer templates must be wrapped in a `<div>` with explicit `font-size` to be rendered correctly.

## Variable Mapping
- Header Left: `{title}` (default)
- Header Right: `{date}` (default)
- Footer Right: `PAGE_NUM` (special internal token for page numbers)
