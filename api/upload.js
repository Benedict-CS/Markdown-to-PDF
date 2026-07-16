/**
 * Vercel serverless function: image "upload".
 *   POST /api/upload  body: { fileName, base64Data } -> { success, path }
 *
 * Vercel's serverless filesystem is read-only (except an ephemeral, per-instance
 * /tmp), and there is no shared disk between the upload and convert functions.
 * Writing images to disk like the local Express server does therefore cannot
 * work across requests here. Instead we return a self-contained `data:` URI:
 * the frontend inserts `![name](data:...)` into the Markdown, which renders
 * correctly in both the in-browser preview and the server-side PDF pipeline.
 *
 * NOTE: data URIs inflate the Markdown by ~33%. Large images can push the
 * /api/convert request body past Vercel's ~4.5MB limit — see README/report.
 */
const path = require('path');

const MIME_BY_EXT = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif',
};

module.exports = (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    const { fileName, base64Data } = body || {};

    if (!fileName || !base64Data) {
        return res.status(400).json({ error: 'Missing file data' });
    }

    // Strip any directory components to prevent path traversal, mirroring the
    // guard in the Express server even though we no longer touch the filesystem.
    const safeName = path.basename(String(fileName));
    if (!safeName || safeName.startsWith('.')) {
        return res.status(400).json({ error: 'Invalid file name' });
    }

    const ext = path.extname(safeName).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
        return res.status(400).json({ error: `Unsupported image type: ${ext || '(none)'}` });
    }

    // Validate that the payload is actually base64 (defensive; avoids emitting a
    // broken data URI). Strip whitespace first.
    const clean = String(base64Data).replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
        return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const dataUri = `data:${mime};base64,${clean}`;
    return res.status(200).json({ success: true, path: dataUri });
};
