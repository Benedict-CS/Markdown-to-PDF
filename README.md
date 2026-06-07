# Elegant Markdown to PDF

A professional Markdown to PDF converter with a focus on clean typography, precise layout control, and unbreakable pagination. Now available as both a CLI tool and a Web Service!

## 🌟 Key Features

- **Web Interface**: Modern UI with real-time preview and full configuration controls.
- **Professional Layouts**: Built-in support for side-by-side columns and data tables.
- **Smart Pagination**: Automatically prevents awkward page breaks.
- **Docker Ready**: Easy deployment to any Linux VM or Cloud platform.

## 📄 Sample Output

Check out the [example.pdf](example.pdf) to see the professional layout in action.

## 🛠️ Installation & Local Run

Ensure you have [Node.js](https://nodejs.org/) installed:

```bash
npm install
npm start # Starts the web server at http://localhost:3000
```

## 🐳 Docker Deployment (Recommended for VM)

This tool is Docker-ready. This is the easiest way to deploy to your Linux VM as it handles all Chrome dependencies automatically.

### 1. Build the image
```bash
docker build -t elegant-md-pdf .
```

### 2. Run the container
```bash
docker run -d -p 3000:3000 --name md-pdf-service elegant-md-pdf
```
Your service will be available at `http://<your-vm-ip>:3000`.

## 🚀 CLI Usage

### Manual Conversion
```bash
npm run convert <your-file.md>
```

### Global Installation
```bash
npm install -g .
mark-pdf <your-file.md>
```

## 🎨 Customization

### Centralized Configuration (`config.js`)
Use `config.js` to tweak settings with English comments support.

| Section | Key | Description |
| :--- | :--- | :--- |
| **pagination** | `enable_auto_page_break` | Master switch. |
| | `break_before_h1/h2/h3` | Independent heading toggles. |
| | `page_number_format` | `"simple"`, `"slash"`, or `"page_of"`. |
| **header_footer** | `show_header` | Toggle document header. |
| | `show_copyright` | Toggle bottom-left text. |

## 📜 License
MIT
