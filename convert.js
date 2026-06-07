const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Core conversion logic using md-to-pdf.
 * This version avoids direct puppeteer/marked dependencies to prevent 500 errors.
 */
async function convert(input, options = {}) {
    const isFile = input && fs.existsSync(path.resolve(input)) && input.endsWith('.md');
    const inputSource = isFile ? { path: path.resolve(input) } : { content: input };

    const cssPath = path.resolve(__dirname, 'style.css');
    const baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

    // Standard Puppeteer templates for Header/Footer
    const headerTemplate = options.header_footer?.show_header ? `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
            <span>${options.header_footer.header_left || ''}</span>
            <span>${options.header_footer.header_right || ''}</span>
        </div>` : '<div></div>';

    let pageNumberHtml = '';
    if (options.header_footer?.footer_right === 'PAGE_NUM') {
        switch (options.header_footer.page_number_format) {
            case 'slash': pageNumberHtml = '<span class="pageNumber"></span> / <span class="totalPages"></span>'; break;
            case 'simple': pageNumberHtml = '<span class="pageNumber"></span>'; break;
            default: pageNumberHtml = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>'; break;
        }
    } else {
        pageNumberHtml = `<span>${options.header_footer?.footer_right || ''}</span>`;
    }

    const footerTemplate = options.header_footer?.show_footer ? `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
            <span>${options.header_footer.footer_left || ''}</span>
            <span>${pageNumberHtml}</span>
        </div>` : '<div></div>';

    try {
        const pdf = await mdToPdf(inputSource, {
            css: baseCss + '\n' + (options.customCss || ''),
            pdf_options: {
                format: 'A4',
                margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
                displayHeaderFooter: !!(options.header_footer?.show_header || options.header_footer?.show_footer),
                headerTemplate,
                footerTemplate,
                printBackground: true
            },
            launch_options: {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            }
        });

        return pdf;
    } catch (error) {
        console.error('❌ md-to-pdf Conversion Error:', error);
        return null;
    }
}

module.exports = { convert };
