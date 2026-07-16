# 🚀 Elegant Markdown to PDF - Professional Writing Station

A Markdown to PDF converter that turns plain text into clean, professional documents. It ships as a web-based writing environment (live preview + one-click PDF export) and also supports command-line and watch-mode conversion.

## ✨ Key Features

- **Live Preview**: A debounced "catch-up" rendering pipeline keeps the PDF/web preview in sync as you type.
- **Granular Header & Footer**: Independent control over the left and right slots of both the header and footer.
- **Dynamic Variables**: Use `{title}`, `{date}`, or `{time}` to inject document metadata into headers/footers.
- **Page-Break Control**: Toggle automatic page breaks before H1/H2/H3 headings, or force a break with `<div class="page-break"></div>`.
- **Document Library**: Manage multiple drafts. Content is auto-saved to the browser's `localStorage`.
- **Image Support**: Upload images (or drag & drop) and reference them with relative paths like `./images/demo.jpg`.
- **Clean UI**: Distraction-free layout with resizable panels, a settings drawer, keyboard shortcuts, and light/dark aware styling.

## 🛠️ Getting Started (Web App)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Open the interface**:
   Visit `http://localhost:3000` (override the port with the `PORT` environment variable).

## 💻 Command Line / Watch Mode

Convert a single Markdown file to a PDF written next to the source (`example.md` → `example.pdf`):

```bash
npm run convert -- path/to/file.md
# or, if installed as a bin:
mark-pdf path/to/file.md
```

Watch a file (and `style.css` / `config.js`) and regenerate the PDF on every change:

```bash
npm run watch -- path/to/file.md
```

If no file is given, both commands default to `example.md`.

## 💡 Tips

- **Forced page break**: `<div class="page-break"></div>`.
- **Inline styling**: Put a `<style>` block at the top of your Markdown to tweak a single document.
- **Header/Footer variables**:
  - `{title}`: the current document's name.
  - `{date}`: current date (YYYY-MM-DD).
  - `{time}`: current local time (HH:mm).

## 🎨 Customization

- Edit `config.js` to change CLI/watch defaults (paper size, margins, page-break behaviour).
- Edit `style.css` to change the base look of the generated PDF (this stylesheet is injected into the PDF, not the web UI).
- Edit `public/ui.css` to restyle the web application itself.

> Note: `index.html` bundles the CodeMirror, Marked, KaTeX, and Mermaid libraries. Editing and Markdown preview (CodeMirror + Marked) are active; math and diagram rendering are not yet wired into the preview/PDF pipeline.

## 🐳 Docker

```bash
docker build -t elegant-md-pdf .
docker run -d -p 3000:3000 --name md-pdf-service elegant-md-pdf
```

`deploy.sh` automates pull → build → restart on a server.

## 📜 License
MIT
