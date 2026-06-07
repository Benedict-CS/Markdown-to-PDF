const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Core conversion logic.
 * Explicitly handles images by setting basedir and avoids 500 errors by using a stable config.
 */
async function convert(input, options = {}) {
    try {
        const isFile = input && fs.existsSync(path.resolve(input)) && input.endsWith('.md');
        const markdownContent = isFile ? fs.readFileSync(path.resolve(input), 'utf8') : input;

        // Path to local style.css
        const cssPath = path.resolve(__dirname, 'style.css');
        const baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

        // Dynamic Pagination Styles
        const isAutoBreak = options.pagination?.enable_auto_page_break !== false;
        const breakH1 = isAutoBreak && options.pagination?.break_before_h1 ? 'always' : 'auto';
        const breakH2 = isAutoBreak && options.pagination?.break_before_h2 ? 'always' : 'auto';
        const breakH3 = isAutoBreak && options.pagination?.break_before_h3 ? 'always' : 'auto';

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

        // Configure PDF options
        const pdfOptions = {
            format: 'A4',
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
            displayHeaderFooter: !!(options.header_footer?.show_header || options.header_footer?.show_footer),
            printBackground: true
        };

        // Templates
        if (pdfOptions.displayHeaderFooter) {
            pdfOptions.headerTemplate = options.header_footer?.show_header ? `
                <div style="font-family: sans-serif; font-size: 10px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
                    <span>${options.header_footer.header_left || ''}</span>
                    <span>${options.header_footer.header_right || ''}</span>
                </div>` : '<div></div>';

            let pageNumHtml = '';
            if (options.header_footer?.footer_right === 'PAGE_NUM') {
                const fmt = options.header_footer.page_number_format;
                if (fmt === 'slash') pageNumHtml = '<span class="pageNumber"></span> / <span class="totalPages"></span>';
                else if (fmt === 'simple') pageNumHtml = '<span class="pageNumber"></span>';
                else pageNumHtml = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>';
            } else {
                pageNumHtml = `<span>${options.header_footer?.footer_right || ''}</span>`;
            }

            pdfOptions.footerTemplate = options.header_footer?.show_footer ? `
                <div style="font-family: sans-serif; font-size: 10px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
                    <span>${options.header_footer.footer_left || ''}</span>
                    <span>${pageNumHtml}</span>
                </div>` : '<div></div>';
        }

        // EXECUTE CONVERSION
        const pdf = await mdToPdf(
            { content: markdownContent },
            {
                basedir: __dirname, // CRITICAL for local images
                css: baseCss + '\n' + dynamicCss + '\n' + (options.customCss || ''),
                pdf_options: pdfOptions,
                launch_options: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                }
            }
        );

        return pdf;
    } catch (error) {
        console.error('❌ md-to-pdf Backend Error:', error.message);
        return null;
    }
}

module.exports = { convert };
