#!/usr/bin/env node
const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Core conversion logic.
 * Set basedir for images and use mergeConfig for flexible settings.
 */
async function convert(input, options = {}) {
    try {
        const isFile = typeof input === 'string' && input.endsWith('.md') && fs.existsSync(path.resolve(input));
        const sourcePath = isFile ? path.resolve(input) : null;
        const markdownContent = isFile ? fs.readFileSync(sourcePath, 'utf8') : input;

        const cssPath = path.resolve(__dirname, 'style.css');
        const baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

        // 1. Default Config
        let config = { 
            pagination: { format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' } },
            header_footer: { show_header: false, show_footer: false }
        };

        // 2. Merge local config.js if exists
        const configJsPath = path.resolve(__dirname, 'config.js');
        if (fs.existsSync(configJsPath)) {
            try {
                delete require.cache[require.resolve(configJsPath)];
                mergeConfig(config, require(configJsPath));
            } catch (e) {}
        }

        // 3. Merge incoming options
        mergeConfig(config, options);

        // 4. Dynamic Pagination Styles (FIX FOR H2 PAGE BREAKS)
        const isAutoBreak = config.pagination.enable_auto_page_break !== false;
        const breakH1 = (isAutoBreak && config.pagination.break_before_h1) ? 'always' : 'auto';
        const breakH2 = (isAutoBreak && config.pagination.break_before_h2) ? 'always' : 'auto';
        const breakH3 = (isAutoBreak && config.pagination.break_before_h3) ? 'always' : 'auto';

        const dynamicCss = `
            :root {
                --h1-page-break: ${breakH1};
                --h2-page-break: ${breakH2};
                --h3-page-break: ${breakH3};
            }
            h1 { page-break-before: var(--h1-page-break) !important; }
            h2 { page-break-before: var(--h2-page-break) !important; }
            h3 { page-break-before: var(--h3-page-break) !important; }
            h1:first-of-type, h2:first-of-type, h3:first-of-type { page-break-before: auto !important; }
        `;

        // 5. Prepare PDF Options
        const pdfOptions = {
            format: config.pagination.format || 'A4',
            margin: config.pagination.margin,
            displayHeaderFooter: !!(config.header_footer.show_header || config.header_footer.show_footer),
            printBackground: true
        };

        if (pdfOptions.displayHeaderFooter) {
            pdfOptions.headerTemplate = config.header_footer.show_header ? `
                <div style="font-family: sans-serif; font-size: 10px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
                    <span>${config.header_footer.header_left || ''}</span>
                    <span>${config.header_footer.header_right || ''}</span>
                </div>` : '<div></div>';

            let pageNumHtml = '';
            if (config.header_footer.footer_right === 'PAGE_NUM') {
                const fmt = config.header_footer.page_number_format;
                if (fmt === 'slash') pageNumHtml = '<span class="pageNumber"></span> / <span class="totalPages"></span>';
                else if (fmt === 'simple') pageNumHtml = '<span class="pageNumber"></span>';
                else pageNumHtml = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>';
            } else {
                pageNumHtml = `<span>${config.header_footer.footer_right || ''}</span>`;
            }

            pdfOptions.footerTemplate = config.header_footer.show_footer ? `
                <div style="font-family: sans-serif; font-size: 10px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
                    <span>${config.header_footer.footer_left || ''}</span>
                    <span>${pageNumHtml}</span>
                </div>` : '<div></div>';
        }

        // 6. Execute
        // When converting a file (CLI / watch mode) write the PDF next to the
        // source. For raw content (web server) set dest to null so md-to-pdf
        // does NOT default to 'stdout' and dump the binary PDF to the terminal;
        // the caller consumes the returned buffer instead.
        const dest = sourcePath ? sourcePath.replace(/\.md$/i, '.pdf') : null;

        return await mdToPdf(
            { content: markdownContent },
            {
                basedir: __dirname,
                dest,
                css: baseCss + '\n' + dynamicCss + '\n' + (options.customCss || ''),
                pdf_options: pdfOptions,
                launch_options: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                }
            }
        );
    } catch (error) {
        console.error('❌ md-to-pdf Backend Error:', error);
        return null;
    }
}

/**
 * Helper to deep merge configurations
 */
function mergeConfig(target, source) {
    if (!source) return;
    for (const key of Object.keys(source)) {
        // Guard against prototype pollution via crafted keys in request bodies.
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            mergeConfig(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
}

module.exports = { convert };

// CLI entry: `node convert.js [file.md]` or the `mark-pdf` bin.
if (require.main === module) {
    const target = process.argv[2] || 'example.md';
    const filePath = path.resolve(process.cwd(), target);

    if (!fs.existsSync(filePath) || !filePath.endsWith('.md')) {
        console.error(`Error: Markdown file not found -> ${filePath}`);
        process.exit(1);
    }

    convert(filePath).then((pdf) => {
        if (pdf && pdf.filename) {
            console.log(`✅ PDF generated: ${pdf.filename}`);
        } else {
            console.error('❌ Conversion failed.');
            process.exit(1);
        }
    });
}
