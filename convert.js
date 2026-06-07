const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Core conversion logic.
 * Set basedir for images and use mergeConfig for flexible settings.
 */
async function convert(input, options = {}) {
    try {
        const isFile = input && fs.existsSync(path.resolve(input)) && input.endsWith('.md');
        const markdownContent = isFile ? fs.readFileSync(path.resolve(input), 'utf8') : input;

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

        // 4. Prepare PDF Options
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

        // 5. Execute
        return await mdToPdf(
            { content: markdownContent },
            {
                basedir: __dirname,
                css: baseCss + '\n' + (options.customCss || ''),
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
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            mergeConfig(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
}

module.exports = { convert };
