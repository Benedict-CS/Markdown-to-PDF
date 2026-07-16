/**
 * Vercel serverless function: return the bundled example Markdown.
 *   GET /api/example -> text/markdown
 */
const path = require('path');
const fs = require('fs');

const EXAMPLE_PATH = path.join(__dirname, '..', 'example.md');

module.exports = (req, res) => {
    try {
        if (!fs.existsSync(EXAMPLE_PATH)) {
            return res.status(404).send('Example file not found');
        }
        const md = fs.readFileSync(EXAMPLE_PATH, 'utf8');
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        return res.status(200).send(md);
    } catch (error) {
        console.error('Example error:', error);
        return res.status(500).send('Failed to read example');
    }
};
