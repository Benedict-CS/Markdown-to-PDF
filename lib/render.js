/**
 * Shared, dependency-light rendering logic used by the Vercel serverless
 * function (api/convert.js). It turns Markdown + a config object into a full
 * HTML document plus the Puppeteer `page.pdf()` options.
 *
 * This intentionally does NOT depend on `md-to-pdf` or `puppeteer` so it can run
 * inside a serverless function that launches Chromium via `puppeteer-core` +
 * `@sparticuz/chromium`. The original `convert.js` (md-to-pdf based) is kept for
 * local/Docker use.
 */
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

// Resolve project root from this file's location (lib/ -> project root).
const ROOT = path.resolve(__dirname, '..');

// Read the print stylesheet. Try a few locations so it resolves both locally
// and inside Vercel's bundled function layout (where the cwd/root may differ).
// `style.css` is also pinned via `includeFiles` in vercel.json.
function readBaseCss() {
    const candidates = [
        path.join(ROOT, 'style.css'),
        path.join(process.cwd(), 'style.css'),
        path.join(__dirname, 'style.css'),
    ];
    for (const cssPath of candidates) {
        try {
            if (fs.existsSync(cssPath)) return fs.readFileSync(cssPath, 'utf8');
        } catch (_) { /* try next */ }
    }
    return '';
}

/**
 * Deep-merge `source` into `target`, guarding against prototype pollution from
 * crafted request bodies (mirrors the guard in convert.js).
 */
function mergeConfig(target, source) {
    if (!source) return target;
    for (const key of Object.keys(source)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            mergeConfig(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

/**
 * Build the effective config by layering: built-in defaults -> caller options.
 * (Unlike convert.js we do NOT merge the local config.js here: config.js carries
 * documentation-stub keys that convert.js does not read, and the web UI already
 * sends a complete config in `options`.)
 */
function buildConfig(options = {}) {
    const config = {
        pagination: {
            format: 'A4',
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        },
        header_footer: { show_header: false, show_footer: false },
    };
    mergeConfig(config, options);
    return config;
}

/** Dynamic page-break CSS derived from the pagination flags (same rules as convert.js). */
function buildDynamicCss(config) {
    const isAutoBreak = config.pagination.enable_auto_page_break !== false;
    const breakH1 = (isAutoBreak && config.pagination.break_before_h1) ? 'always' : 'auto';
    const breakH2 = (isAutoBreak && config.pagination.break_before_h2) ? 'always' : 'auto';
    const breakH3 = (isAutoBreak && config.pagination.break_before_h3) ? 'always' : 'auto';

    return `
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
}

/** Assemble the Puppeteer `page.pdf()` options + header/footer templates. */
function buildPdfOptions(config) {
    const hf = config.header_footer || {};
    const pdfOptions = {
        format: config.pagination.format || 'A4',
        margin: config.pagination.margin,
        displayHeaderFooter: !!(hf.show_header || hf.show_footer),
        printBackground: true,
    };

    if (pdfOptions.displayHeaderFooter) {
        pdfOptions.headerTemplate = hf.show_header ? `
            <div style="font-family: sans-serif; font-size: 10px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
                <span>${hf.header_left || ''}</span>
                <span>${hf.header_right || ''}</span>
            </div>` : '<div></div>';

        let pageNumHtml = '';
        if (hf.footer_right === 'PAGE_NUM') {
            const fmt = hf.page_number_format;
            if (fmt === 'slash') pageNumHtml = '<span class="pageNumber"></span> / <span class="totalPages"></span>';
            else if (fmt === 'simple') pageNumHtml = '<span class="pageNumber"></span>';
            else pageNumHtml = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>';
        } else {
            pageNumHtml = `<span>${hf.footer_right || ''}</span>`;
        }

        pdfOptions.footerTemplate = hf.show_footer ? `
            <div style="font-family: sans-serif; font-size: 10px; width: 100%; margin: 0 15mm; display: flex; justify-content: space-between; color: #999;">
                <span>${hf.footer_left || ''}</span>
                <span>${pageNumHtml}</span>
            </div>` : '<div></div>';
    }

    return pdfOptions;
}

/**
 * Render Markdown content into a complete HTML document string and derive the
 * matching PDF options.
 *
 * @param {string} markdownContent Raw Markdown.
 * @param {object} options         Config from the web UI (pagination, header_footer, customCss).
 * @param {object} extra           Optional { baseHref } to resolve relative asset URLs.
 * @returns {{ html: string, pdfOptions: object, config: object }}
 */
function render(markdownContent, options = {}, extra = {}) {
    const config = buildConfig(options);
    const baseCss = readBaseCss();
    const dynamicCss = buildDynamicCss(config);
    const customCss = options.customCss || '';
    const pdfOptions = buildPdfOptions(config);

    // marked with GitHub-flavoured Markdown to match the in-browser preview.
    const body = marked.parse(String(markdownContent), { gfm: true, breaks: false });

    const baseTag = extra.baseHref ? `<base href="${extra.baseHref}">` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
${baseTag}
<style>
${baseCss}
${dynamicCss}
${customCss}
</style>
</head>
<body>
${body}
</body>
</html>`;

    return { html, pdfOptions, config };
}

module.exports = { render, mergeConfig, buildConfig, buildPdfOptions, buildDynamicCss };
