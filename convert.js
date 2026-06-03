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
    const configPath = path.resolve(__dirname, 'config.json');

    let css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    let config = { 
        pdf_options: { 
            format: 'A4', 
            margin: { top: '10mm', right: '15mm', bottom: '12mm', left: '15mm' },
            displayHeaderFooter: true 
        },
        features: { auto_page_break_h2: true }
    };

    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config = { ...config, ...userConfig };
            config.pdf_options = { ...config.pdf_options, ...userConfig.pdf_options };
            config.features = { ...config.features, ...userConfig.features };
        } catch (e) {
            console.error('Error parsing config.json, using defaults.');
        }
    }

    // Inject configuration into CSS variables
    const injectedStyles = `
        :root {
            --h2-page-break: ${config.features.auto_page_break_h2 ? 'always' : 'auto'};
        }
    `;
    css = injectedStyles + css;

    try {
        const pdf = await mdToPdf({ path: inputPath }, { 
            dest: outputPath,
            css: css,
            stylesheet: [], // Disable default stylesheets
            pdf_options: {
                ...config.pdf_options,
                headerTemplate: '<span></span>',
                footerTemplate: config.pdf_options.displayHeaderFooter ? `
                    <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; text-align: center; color: #888;">
                        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
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
