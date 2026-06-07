const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const marked = require('marked');

let browserInstance = null;

async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) return browserInstance;
    browserInstance = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    return browserInstance;
}

async function convert(input, options = {}) {
    const isFile = input && fs.existsSync(path.resolve(input)) && input.endsWith('.md');
    const markdownContent = isFile ? fs.readFileSync(path.resolve(input), 'utf8') : input;

    const cssPath = path.resolve(__dirname, 'style.css');
    const configJsPath = path.resolve(__dirname, 'config.js');

    let config = { 
        pagination: { format: 'A4', margin: { top: '10mm', right: '15mm', bottom: '12mm', left: '15mm' } },
        header_footer: { show_header: false, show_footer: false }
    };

    if (fs.existsSync(configJsPath)) {
        try {
            delete require.cache[require.resolve(configJsPath)];
            mergeConfig(config, require(configJsPath));
        } catch (e) {}
    }
    mergeConfig(config, options);

    // Safe marked parsing
    let htmlBody = '';
    try {
        htmlBody = (typeof marked.parse === 'function') ? marked.parse(markdownContent) : marked(markdownContent);
    } catch (e) { htmlBody = markdownContent; }

    const baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const finalCss = baseCss + '\n' + (options.customCss || '');

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${finalCss}</style></head><body class="markdown-body">${htmlBody}</body></html>`;

    const headerTemplate = config.header_footer.show_header ? `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; color: #aaa;">
            <span>${config.header_footer.header_left || ''}</span>
            <span>${config.header_footer.header_right || ''}</span>
        </div>` : '<span></span>';

    let pageNumberHtml = '';
    if (config.header_footer.footer_right === 'PAGE_NUM') {
        switch (config.header_footer.page_number_format) {
            case 'slash': pageNumberHtml = '<span class="pageNumber"></span> / <span class="totalPages"></span>'; break;
            case 'simple': pageNumberHtml = '<span class="pageNumber"></span>'; break;
            default: pageNumberHtml = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>'; break;
        }
    } else {
        pageNumberHtml = `<span>${config.header_footer.footer_right || ''}</span>`;
    }

    const footerTemplate = config.header_footer.show_footer ? `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; color: #888;">
            <span>${config.header_footer.footer_left || ''}</span>
            ${pageNumberHtml}
        </div>` : '<span></span>';

    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: 'load' });
        const pdfBuffer = await page.pdf({
            format: config.pagination.format,
            margin: config.pagination.margin,
            displayHeaderFooter: config.header_footer.show_header || config.header_footer.show_footer,
            headerTemplate, footerTemplate, printBackground: true
        });
        await page.close();
        return { content: pdfBuffer };
    } catch (error) {
        console.error('Conversion Error:', error);
        return null;
    }
}

function mergeConfig(target, source) {
    if (!source) return;
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            mergeConfig(target[key], source[key]);
        } else { target[key] = source[key]; }
    }
}

module.exports = { convert };
