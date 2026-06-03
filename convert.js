const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Converts a markdown file to PDF with pre-defined styling and user configuration.
 * @param {string} inputFile - Path to the markdown file.
 * @returns {Promise<Object|null>} - The PDF object or null on failure.
 */
async function convert(inputFile) {
    if (!inputFile) {
        console.error('Usage: node convert.js <input.md>');
        return null;
    }

    const inputPath = path.resolve(inputFile);
    if (!fs.existsSync(inputPath)) {
        console.error(`File not found: ${inputPath}`);
        return null;
    }

    const outputPath = inputPath.replace(/\.md$/, '.pdf');
    const cssPath = path.resolve(__dirname, 'style.css');
    const customCssPath = path.resolve(__dirname, 'custom.css');
    const configPath = path.resolve(__dirname, 'config.json');

    // Default configuration
    let config = { 
        pdf_options: { 
            format: 'A4', 
            margin: { top: '10mm', right: '15mm', bottom: '12mm', left: '15mm' },
            displayHeaderFooter: true 
        },
        metadata: { title: 'Document', author: '', footer_left: '' },
        appearance: { 
            accent_color: '#0366d6', 
            text_color: '#333333', 
            base_font_size: '14px', 
            line_height: '1.5',
            h1_border_color: '#333333'
        },
        features: { 
            auto_page_break_h2: true, 
            use_custom_css: true,
            display_document_header: false
        }
    };

    // Load and deeply merge user configuration
    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            if (userConfig.pdf_options) {
                config.pdf_options = { ...config.pdf_options, ...userConfig.pdf_options };
                // Ensure nested margin object is deeply merged
                if (userConfig.pdf_options.margin) {
                    config.pdf_options.margin = { ...config.pdf_options.margin, ...userConfig.pdf_options.margin };
                }
            }
            if (userConfig.metadata) config.metadata = { ...config.metadata, ...userConfig.metadata };
            if (userConfig.appearance) config.appearance = { ...config.appearance, ...userConfig.appearance };
            if (userConfig.features) config.features = { ...config.features, ...userConfig.features };
        } catch (e) {
            console.error('❌ Error parsing config.json, using defaults.');
        }
    }

    // Load base CSS and custom CSS
    let baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    let customCss = (config.features.use_custom_css && fs.existsSync(customCssPath)) ? fs.readFileSync(customCssPath, 'utf8') : '';

    // Inject Dynamic Appearance into CSS
    // CRITICAL FIX: This must be placed AFTER the base CSS so the variables override the defaults in :root
    const themeStyles = `
        :root {
            --accent-color: ${config.appearance.accent_color} !important;
            --text-color: ${config.appearance.text_color} !important;
            --base-font-size: ${config.appearance.base_font_size} !important;
            --line-height: ${config.appearance.line_height} !important;
            --h1-border: 2px solid ${config.appearance.h1_border_color} !important;
            --h2-page-break: ${config.features.auto_page_break_h2 ? 'always' : 'auto'} !important;
        }
    `;
    
    // Assemble final CSS
    const finalCss = baseCss + '\n' + themeStyles + '\n' + customCss;

    // Header Template (Metadata)
    const headerTemplate = config.features.display_document_header ? `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; color: #aaa;">
            <span>${config.metadata.title}</span>
            <span>${config.metadata.author}</span>
        </div>
    ` : '<span></span>';

    // Footer Template (Pagination & Copyright)
    const footerTemplate = config.pdf_options.displayHeaderFooter ? `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; color: #888;">
            <span>${config.metadata.footer_left}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
    ` : '<span></span>';

    try {
        const pdf = await mdToPdf({ path: inputPath }, { 
            dest: outputPath,
            css: finalCss,
            stylesheet: [], // Disable default stylesheets to prevent conflicts
            pdf_options: {
                ...config.pdf_options,
                headerTemplate: headerTemplate,
                footerTemplate: footerTemplate,
                waitUntil: 'networkidle0', // Ensure images load
            },
            launch_options: {
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--allow-file-access-from-files',
                    '--enable-local-file-access'
                ]
            }
        });

        if (pdf) {
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Conversion successful: ${path.basename(pdf.filename)}`);
            return pdf;
        }
    } catch (error) {
        console.error('❌ Error during conversion:', error);
        return null;
    }
}

if (require.main === module) {
    const inputFile = process.argv[2];
    convert(inputFile).then(result => {
        if (!result) process.exit(1);
    });
}

module.exports = { convert };
