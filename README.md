# 🚀 Elegant Markdown to PDF - Professional Writing Station

A high-end Markdown to PDF converter that transforms simple text into professional, polished documents. Beyond a simple converter, this is a full-featured web-based writing station designed for resumes, technical manuals, and academic papers.

## 🌟 Superpowers

- **🛠️ Document Library**: Manage multiple drafts directly in your browser. Rename, switch, or delete documents with ease.
- **☁️ Zero-Loss Persistence**: Every keystroke is auto-saved to your browser's local storage. Never lose your work again.
- **📐 Technical Excellence**:
    - **KaTeX Support**: Render beautiful LaTeX math formulas (e.g., `$$ E=mc^2 $$`).
    - **Mermaid Diagrams**: Create flowcharts, sequence diagrams, and Gantt charts directly in Markdown.
- **⚡ Pro UI/UX**:
    - **Live Preview**: Near-instant PDF rendering as you type.
    - **Smart Zoom**: "Fit to width" or fixed scale preview modes.
    - **Custom Styling**: Support for standard `<style>` tags and HTML/CSS layouts.
    - **Drag & Drop**: Simply drop a `.md` file into the editor to load it.
- **📑 Smart Export**: Automatically names your PDF/Markdown files based on your document name or first H1 header.

## 🖥️ Web Interface

Designed for a focused writing experience:
- **Left**: Markdown Editor with syntax highlighting.
- **Middle**: Real-time professional PDF viewer.
- **Right**: Granular control over headers, footers, pagination, and page formats (A4, Letter, Legal).

## 🐳 Docker & VM Deployment (Recommended)

This tool is production-ready. The easiest way to deploy is using Docker, which handles all Chrome/Puppeteer dependencies automatically.

### One-Click Update (VM)
We provide a dedicated deployment script for easy updates:
```bash
git pull
chmod +x deploy.sh
./deploy.sh
```

### Manual Docker Run
```bash
docker build -t elegant-md-pdf .
docker run -d -p 3000:3000 --name md-pdf-service --restart unless-stopped elegant-md-pdf
```

## 🛠️ Local Development

1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. Access at `http://localhost:3000`

## 🚀 Pro Tips & Shortcuts

- **Manual Page Break**: Use `<div class="page-break"></div>` to force a new page.
- **Columns**: Use `flex-container` and `flex-item` classes for side-by-side layouts.
- **Shortcuts**:
    - `Ctrl + S`: Quick Download PDF
    - `Ctrl + P`: Force Refresh Preview

## 🎨 Customization
You can tweak global defaults in `config.js` or inject styles directly into your document using `<style>` tags at the top of your Markdown.

## 📜 License
MIT
