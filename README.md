# Elegant Markdown to PDF

A professional Markdown to PDF converter with a focus on clean typography, precise layout control, and unbreakable pagination.

## 🌟 Key Features

- **Professional Layouts**: Built-in support for side-by-side columns using simple HTML/CSS classes.
- **Smart Pagination**: Automatically prevents paragraphs, list items, and tables from breaking across pages.
- **Clean Tables**: Minimalist data table styling (no more "ugly big boxes").
- **Live Watch Mode**: Real-time PDF updates as you save your changes.
- **Customizable**: Easy-to-edit CSS for personalized themes.

## 📄 Sample Output

Check out the [example.pdf](samples/example.pdf) to see the professional layout and pagination in action.

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

## 🎨 Layout Examples

### Side-by-Side Columns
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
