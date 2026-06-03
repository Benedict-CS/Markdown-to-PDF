# Elegant Markdown to PDF

A professional Markdown to PDF converter with a focus on clean typography, precise layout control, and unbreakable pagination.

## 🌟 Key Features

- **Professional Layouts**: Built-in support for side-by-side columns using simple HTML/CSS classes.
- **Smart Pagination**: Automatically prevents paragraphs, list items, and tables from breaking across pages.
- **Clean Tables**: Minimalist data table styling (no more "ugly big boxes").
- **Live Watch Mode**: Real-time PDF updates as you save your changes.
- **Customizable**: Easy-to-edit JavaScript configuration with full comment support.

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
Automatically regenerates the PDF every time you save your `.md`, `.css`, or `config.js` files.
```bash
npm run watch <your-file.md>
```

## 🎨 Customization

### Centralized Configuration (`config.js`)
You can control the tool's behavior using **`config.js`**. This file supports **English comments**, making it easy to understand each setting.

| Section | Key | Description |
| :--- | :--- | :--- |
| **pagination** | `enable_auto_page_break` | Master switch for automatic page breaks. |
| | `break_before_h1` | If true, starts a new page before `#` headers. |
| | `break_before_h2` | If true, starts a new page before `##` headers. |
| | `break_before_h3` | If true, starts a new page before `###` headers. |
| | `page_number_format` | Choose format (see below). |
| **header_footer** | `show_header` | Show Title & Author at page top. |
| | `show_copyright` | Show copyright text at bottom left. |
| | `show_page_numbers` | Show page numbers at bottom right. |

#### Page Number Formats (`page_number_format`):
- `"page_of"`: `Page 1 of 5` (Default)
- `"slash"`: `1 / 5`
- `"simple"`: `1`

### Styling (CSS)
Modify `style.css` to adjust fonts and colors. Use the `appearance` block in `config.js` for quick color/font size changes.

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
