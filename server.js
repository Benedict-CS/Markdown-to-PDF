const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { convert } = require('./convert');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

/**
 * API Endpoint: Upload Image
 */
app.post('/api/upload', (req, res) => {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
        return res.status(400).json({ error: 'Missing file data' });
    }

    try {
        const filePath = path.join(__dirname, 'images', fileName);
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        console.log(`[${new Date().toLocaleTimeString()}] 🖼️ Image uploaded: ${fileName}`);
        res.json({ success: true, path: `./images/${fileName}` });
    } catch (error) {
        console.error('❌ Upload Error:', error);
        res.status(500).json({ error: 'Failed to save image' });
    }
});

/**
 * API Endpoint: Get Example Markdown
 */
app.get('/api/example', (req, res) => {
    const examplePath = path.join(__dirname, 'example.md');
    if (fs.existsSync(examplePath)) {
        res.sendFile(examplePath);
    } else {
        res.status(404).send('Example file not found');
    }
});

/**
 * API Endpoint: Convert Markdown to PDF
 */
app.post('/api/convert', async (req, res) => {
    const { markdownContent, configOptions } = req.body;

    if (!markdownContent) {
        return res.status(400).json({ error: 'Markdown content is required' });
    }

    try {
        console.log(`[${new Date().toLocaleTimeString()}] 📥 Received conversion request...`);
        
        const pdf = await convert(markdownContent, configOptions);

        if (pdf && pdf.content) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=document.pdf');
            res.send(pdf.content);
            console.log(`[${new Date().toLocaleTimeString()}] 📤 PDF sent successfully.`);
        } else {
            throw new Error('Failed to generate PDF content');
        }
    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ error: 'Internal Server Error during conversion' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Elegant Markdown to PDF server is running at http://localhost:${PORT}`);
});
