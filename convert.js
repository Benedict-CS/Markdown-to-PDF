const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

/**
 * Converts a markdown file to PDF with pre-defined styling and user configuration.
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
    const configJsPath = path.resolve(__dirname, 'config.js');

    // 1. Default configuration
    let config = { 
        pagination: { 
            enable_auto_page_break: true,
            auto_page_break_level: 2, 
            format: 'A4', 
            margin: { top: '10mm', right: '15mm', bottom: '12mm', left: '15mm' }
        },
        header_footer: {
            copyright_text: '',
            show_copyright: true,
            show_page_numbers: true,
            page_number_format: 'page_of'
        },
        appearance: { 
            accent_color: '#0366d6', 
            text_color: '#333333', 
            base_font_size: '14px', 
            line_height: '1.5'
        },
        features: { use_custom_css: true }
    };

    // 2. Load user configuration from config.js (supports comments!)
    if (fs.existsSync(configJsPath)) {
        try {
            // Delete cache to allow hot-reloading during 'watch'
            delete require.cache[require.resolve(configJsPath)];
            const userConfig = require(configJsPath);
            
            if (userConfig.pagination) {
                config.pagination = { ...config.pagination, ...userConfig.pagination };
                if (userConfig.pagination.margin) {
                    config.pagination.margin = { ...config.pagination.margin, ...userConfig.pagination.margin };
                }
            }
            if (userConfig.header_footer) config.header_footer = { ...config.header_footer, ...userConfig.header_footer };
            if (userConfig.appearance) config.appearance = { ...config.appearance, ...userConfig.appearance };
            if (userConfig.features) config.features = { ...config.features, ...userConfig.features };
        } catch (e) {
            console.error('❌ Error loading config.js, using defaults.', e);
        }
    }

    // 3. CSS Logic
    let baseCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    let customCss = (config.features.use_custom_css && fs.existsSync(customCssPath)) ? fs.readFileSync(customCssPath, 'utf8') : '';

    // Precise Page Break Logic
    const isEnabled = config.pagination.enable_auto_page_break;
    const level = config.pagination.auto_page_break_level;
    
    // We force 'auto' if disabled or level is lower, 'always' if enabled and level matches
    const breakRules = `
        h1 { page-break-before: ${(isEnabled && level >= 1) ? 'always' : 'auto'} !important; }
        h2 { page-break-before: ${(isEnabled && level >= 2) ? 'always' : 'auto'} !important; }
        h3 { page-break-before: ${(isEnabled && level >= 3) ? 'always' : 'auto'} !important; }
    `;

    const themeStyles = `
        :root {
            --accent-color: ${config.appearance.accent_color};
            --text-color: ${config.appearance.text_color};
            --base-font-size: ${config.appearance.base_font_size};
            --line-height: ${config.appearance.line_height};
        }
        ${breakRules}
    `;
    
    const finalCss = baseCss + '\n' + themeStyles + '\n' + customCss;

    // 4. Header/Footer Templates
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

    const enableHeaderFooter = config.header_footer.show_copyright || config.header_footer.show_page_numbers;

    try {
        const pdf = await mdToPdf({ path: inputPath }, { 
            dest: outputPath,
            css: finalCss,
            stylesheet: [], 
            pdf_options: {
                format: config.pagination.format,
                margin: config.pagination.margin,
                displayHeaderFooter: enableHeaderFooter,
                headerTemplate: '<span></span>',
                footerTemplate: footerTemplate,
                waitUntil: 'networkidle0',
            },
            launch_options: {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--enable-local-file-access']
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
