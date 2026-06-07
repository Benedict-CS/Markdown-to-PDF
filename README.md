# 🚀 Elegant Markdown to PDF - Professional Writing Station

A high-end Markdown to PDF converter that transforms simple text into professional, polished documents. This is a full-featured web-based writing environment optimized for resumes, technical documentation, and elegant reports.

## ✨ Key Features

- **Extreme Real-Time Preview**: Powered by a "Catch-up" rendering engine and persistent backend browser for near-instant feedback.
- **Granular Header & Footer**: Independent control over Left and Right quadrants for both header and footer.
- **Dynamic Variables**: Use `{title}`, `{date}`, or `{time}` to automatically inject document metadata into your headers/footers.
- **Document Library**: Manage multiple drafts locally. Your work is automatically saved as you type.
- **Professional Layout**: GitHub-style Markdown rendering with support for Page Breaks, Flexbox layouts, and automatic pagination.
- **Image Support**: Fully supports local images (relative paths like `./images/demo.jpg`).
- **Clean Aesthetic**: Modern, distraction-free UI with "Fit" and "100%" viewing modes.

## 🛠️ Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Station**:
   ```bash
   npm start
   ```

3. **Access the Interface**:
   Open `http://localhost:3000` in your browser.

## 💡 Pro Tips

- **Forced Page Break**: Use `<div class="page-break"></div>` to start a new page.
- **Custom Styling**: Inject CSS directly into your document using `<style>` tags at the top of your Markdown.
- **Header/Footer Variables**:
  - `{title}`: The name of the current document.
  - `{date}`: Current date (YYYY-MM-DD).
  - `{time}`: Current local time (HH:mm).

## 🎨 Customization

You can tweak global defaults in `config.js` or modify `style.css` to change the base look of all generated PDFs.

## 📜 License
MIT
