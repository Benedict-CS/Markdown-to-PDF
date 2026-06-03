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
    
    await convert(targetFile);
    
    isCompiling = false;
};

// 監控整個資料夾以確保在 Windows 上的穩定性
fs.watch(__dirname, (eventType, filename) => {
    // 只要是 Markdown, CSS 或 Config 變動，就觸發轉換
    const watchedFiles = [targetFile, 'style.css', 'config.json'];
    if (watchedFiles.includes(filename)) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(triggerConversion, 200); 
    }
});
