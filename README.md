# Elegant Markdown to PDF

A professional Markdown to PDF converter with a focus on clean typography, precise layout control, and unbreakable pagination.

## 🌟 Key Features

- **Professional Layouts**: Built-in support for side-by-side columns using simple HTML/CSS classes.
- **Smart Pagination**: Automatically prevents paragraphs, list items, and tables from breaking across pages.
- **Clean Tables**: Minimalist data table styling (no more "ugly big boxes").
- **Live Watch Mode**: Real-time PDF updates as you save your changes.
- **Customizable**: Easy-to-edit CSS for personalized themes.

## 📄 Sample Output

Check out the [example.pdf](example.pdf) to see the professional layout and pagination in action.

## 🛠️ Installation

Ensure you have [Node.js](https://nodejs.org/) installed, then run:

```bash
npm install
```

## 🚀 Usage

### 1. Manual Conversion
```bash
npm run convert <your-file.md>
```

### 2. Live Watch Mode
Automatically regenerates the PDF every time you save your `.md` or `.css` files.
```bash
npm run watch <your-file.md>
```

## 🎨 Customization

### Centralized Configuration (`config.json`)
You can now control the core features without touching the code. Edit `config.json` to:
- **Adjust Pagination**:
  - `display_header_footer`: Toggle entire header/footer system.
  - `auto_page_break_level`: Set which heading level (1-3) triggers a new page. Set to `0` to disable.
  - `page_number_format`: Choose from `"page_of"` (Page 1 of 5), `"slash"` (1 / 5), or `"simple"` (1).
- **Document Metadata**: Add your name and copyright to the `metadata` block. 
- **Theme Variables**: Modify the `appearance` block to easily change the accent color, text color, base font size, and line height without writing CSS.
- **Adjust Margins**: Modify the `pdf_options.margin` object.

### Styling (CSS)
Modify `style.css` to adjust fonts, colors, and specific element appearances.

### Advanced Layouts

#### Side-by-Side Columns
Use the `flex-container` and `flex-item` classes to create multi-column layouts:

```html
<div class="flex-container">
  <div class="flex-item">
    <h3>Column Left</h3>
    <p>Some content on the left.</p>
  </div>
  <div class="flex-item">
    <h3>Column Right</h3>
    <p>Some content on the right.</p>
  </div>
</div>
```

#### Manual Page Breaks
To force a new page at a specific point, add this tag in your Markdown:
```html
<div class="page-break"></div>
```

### Professional Tables
Standard Markdown tables are automatically styled. For advanced control, use the `data-table` class:

```html
<table class="data-table">
  <tr><th>Task</th><th>Status</th></tr>
  <tr><td>Refactor Code</td><td>Done</td></tr>
</table>
```

## 📜 License
MIT
