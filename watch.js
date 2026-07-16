const fs = require('fs');
const path = require('path');
const { convert } = require('./convert');

const targetFile = process.argv[2] || 'example.md';
const filePath = path.resolve(__dirname, targetFile);

if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found -> ${filePath}`);
    process.exit(1);
}

console.log(`🚀 Watch mode started for: ${targetFile}`);
console.log(`📝 Monitoring changes... (Press Ctrl+C to stop)`);
console.log('---');

let isCompiling = false;
let timeout = null;

const triggerConversion = async () => {
    if (isCompiling) return;
    isCompiling = true;
    
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Change detected. Re-generating PDF...`);

    try {
        const pdf = await convert(filePath);
        if (pdf && pdf.filename) {
            console.log(`✅ [${new Date().toLocaleTimeString()}] Wrote ${pdf.filename}`);
        }
    } catch (err) {
        console.error('❌ Conversion error:', err);
    } finally {
        isCompiling = false;
    }
};

// Watch the whole folder for stability on Windows.
fs.watch(__dirname, (eventType, filename) => {
    // Trigger a conversion whenever the Markdown, CSS or config file changes.
    const watchedFiles = [targetFile, 'style.css', 'config.js'];
    if (watchedFiles.includes(filename)) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(triggerConversion, 200); 
    }
});
