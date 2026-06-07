const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Core conversion logic.
 * Supports both file paths and raw markdown content.
 */
async function convert(input, options = {}) {
    const isFile = input && fs.existsSync(path.resolve(input)) && input.endsWith('.md');
    const inputSource = isFile ? { path: path.resolve(input) } : { content: input };

    const cssPath = path.resolve(__dirname, 'style.css');
    const customCssPath = path.resolve(__dirname, 'custom.css');
    const configJsPath = path.resolve(__dirname, 'config.js');

    // 1. Default configuration
    let config = { 
        pagination: { 
            enable_auto_page_break: true,
            break_before_h1: false,
            break_before_h2: false,
            break_before_h3: false,
            format: 'A4', 
            margin: { top: '10mm', right: '15mm', bottom: '12mm', left: '15mm' }
        },
        header_footer: {
            show_header: false,
            header_title: 'Document',
            header_author: '',
            show_copyright: true,
            copyright_text: '',
            show_page_numbers: true,
            page_number_format: 'page_of'
        },
        appearance: { 
            accent_color: '#0366d6', 
            text_color: '#333333', 
            base_font_size: '14px', 
            line_height: '1.5',
            h1_border_color: '#333333'
        },
        features: { use_custom_css: true }
    };

    // 2. Override with local config.js if exists
    if (fs.existsSync(configJsPath)) {
        try {
            delete require.cache[require.resolve(configJsPath)];
            const userConfig = require(configJsPath);
            mergeConfig(config, userConfig);
        } catch (e) {
            console.error('❌ Error loading config.js, using defaults.', e);
        }
    }

    // 3. Override with dynamic options (from API or CLI)
    mergeConfig(config, options);

    // 4. Assemble CSS
    const baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const customCssFile = (config.features.use_custom_css && fs.existsSync(customCssPath)) ? fs.readFileSync(customCssPath, 'utf8') : '';
    const dynamicCustomCss = options.customCss || '';

    const isEnabled = config.pagination.enable_auto_page_break;
    
    const breakRules = `
        h1 { page-break-before: ${(isEnabled && config.pagination.break_before_h1) ? 'always' : 'auto'} !important; }
        h2 { page-break-before: ${(isEnabled && config.pagination.break_before_h2) ? 'always' : 'auto'} !important; }
        h3 { page-break-before: ${(isEnabled && config.pagination.break_before_h3) ? 'always' : 'auto'} !important; }
        h1 + h2, h1 + h3, h2 + h3 { page-break-before: auto !important; }
    `;

    const themeStyles = `
        :root {
            --accent-color: ${config.appearance.accent_color} !important;
            --text-color: ${config.appearance.text_color} !important;
            --base-font-size: ${config.appearance.base_font_size} !important;
            --line-height: ${config.appearance.line_height} !important;
            --h1-border: 2px solid ${config.appearance.h1_border_color} !important;
        }
        ${breakRules}
    `;
    
    const finalCss = baseCss + '\n' + themeStyles + '\n' + customCssFile + '\n' + dynamicCustomCss;

    // 5. Header/Footer Templates
    const headerTemplate = config.header_footer.show_header ? `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; color: #aaa;">
            <span>${config.header_footer.header_title}</span>
            <span>${config.header_footer.header_author}</span>
        </div>
    ` : '<span></span>';

    let pageNumberHtml = '';
    if (config.header_footer.show_page_numbers) {
        switch (config.header_footer.page_number_format) {
            case 'slash': pageNumberHtml = '<span class="pageNumber"></span> / <span class="totalPages"></span>'; break;
            case 'simple': pageNumberHtml = '<span class="pageNumber"></span>'; break;
            default: pageNumberHtml = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>'; break;
        }
    }

    const footerTemplate = `
        <div style="font-family: -apple-system, sans-serif; font-size: 9px; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; color: #888;">
            <span>${config.header_footer.show_copyright ? config.header_footer.copyright_text : ''}</span>
            <span>${pageNumberHtml}</span>
        </div>
    `;

    const enableHeaderFooter = config.header_footer.show_header || config.header_footer.show_copyright || config.header_footer.show_page_numbers;

    try {
        const pdf = await mdToPdf(inputSource, { 
            css: finalCss,
            stylesheet: [
                'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
            ], 
            script: [
                { url: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js' },
                { url: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js' },
                { content: 'document.addEventListener("DOMContentLoaded", function() { renderMathInElement(document.body); });' },
                { url: 'https://cdn.jsdelivr.net/npm/mermaid@10.2.4/dist/mermaid.min.js' },
                { content: 'mermaid.initialize({ startOnLoad: true, theme: "default" });' }
            ],
            pdf_options: {
                format: config.pagination.format,
                margin: config.pagination.margin,
                displayHeaderFooter: enableHeaderFooter,
                headerTemplate: headerTemplate,
                footerTemplate: footerTemplate,
                waitUntil: 'networkidle2', // Faster than networkidle0, waits for most network activity to end
            },
            launch_options: {
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage', 
                    '--disable-accelerated-2d-canvas', 
                    '--no-first-run', 
                    '--no-zygote', 
                    '--single-process', 
                    '--disable-gpu'
                ]
            }
        });

        return pdf;
    } catch (error) {
        console.error('❌ Error during conversion:', error);
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

// CLI Support
if (require.main === module) {
    const inputFile = process.argv[2];
    if (!inputFile) {
        console.error('Usage: node convert.js <input.md>');
        process.exit(1);
    }
    convert(inputFile).then(pdf => {
        if (pdf) {
            const outputPath = inputFile.replace(/\.md$/, '.pdf');
            fs.writeFileSync(outputPath, pdf.content);
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Conversion successful: ${path.basename(outputPath)}`);
        }
    });
}

module.exports = { convert };
