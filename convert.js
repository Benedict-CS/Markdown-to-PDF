const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Converts a markdown file to PDF with pre-defined styling.
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
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

    try {
        const pdf = await mdToPdf({ path: inputPath }, { 
            dest: outputPath,
            css: css,
            stylesheet: [], // Disable default stylesheets
            
            /* ============================================================
               PDF Generation Options
               Customize your PDF output here (Margins, Page Numbers, etc.)
               Reference: https://pptr.dev/api/puppeteer.pdfoptions
               ============================================================ */
            pdf_options: {
                format: 'A4',
                // Adjust margins here. Decrease for more content per page.
                margin: { top: '10mm', right: '15mm', bottom: '12mm', left: '15mm' },
                
                // Set to false to hide headers and page numbers
                displayHeaderFooter: true,
                headerTemplate: '<span></span>',
                
                // Customize page number styling or remove to hide
                footerTemplate: `
                    <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; text-align: center; color: #888;">
                        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                    </div>
                `,
                // Wait for all network requests (images, styles) to finish
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

// Support CLI execution
if (require.main === module) {
    const inputFile = process.argv[2];
    convert(inputFile).then(result => {
        if (!result) process.exit(1);
    });
}

module.exports = { convert };
