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
        features: { auto_page_break_h2: true, use_custom_css: true }
    };

    // Load user configuration
    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config = {
                ...config,
                pdf_options: { ...config.pdf_options, ...userConfig.pdf_options },
                metadata: { ...config.metadata, ...userConfig.metadata },
                appearance: { ...config.appearance, ...userConfig.appearance },
                features: { ...config.features, ...userConfig.features }
            };
        } catch (e) {
            console.error('Error parsing config.json, using defaults.');
        }
    }

    // Inject Dynamic Appearance into CSS
    const themeStyles = `
        :root {
            --accent-color: ${config.appearance.accent_color};
            --text-color: ${config.appearance.text_color};
            --base-font-size: ${config.appearance.base_font_size};
            --line-height: ${config.appearance.line_height};
            --h1-border: 2px solid ${config.appearance.h1_border_color};
            --h2-page-break: ${config.features.auto_page_break_h2 ? 'always' : 'auto'};
        }
    `;
    
    // Load base CSS and handle Custom CSS injection
    let baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    let customCss = (config.features.use_custom_css && fs.existsSync(customCssPath)) ? fs.readFileSync(customCssPath, 'utf8') : '';
    
    const finalCss = themeStyles + baseCss + '\n' + customCss;

    try {
        const pdf = await mdToPdf({ path: inputPath }, { 
            dest: outputPath,
            css: finalCss,
            stylesheet: [], // Disable default stylesheets
            pdf_options: {
                ...config.pdf_options,
                headerTemplate: '<span></span>',
                footerTemplate: config.pdf_options.displayHeaderFooter ? `
                    <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; color: #888;">
                        <span>${config.metadata.footer_left}</span>
                        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                    </div>
                ` : '<span></span>',
                waitUntil: 'networkidle0',
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
