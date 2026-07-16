/**
 * Vercel serverless function: Markdown -> PDF.
 *
 * Headless Chrome does not work on Vercel's serverless runtime out of the box,
 * so this launches Chromium via `puppeteer-core` + `@sparticuz/chromium` instead
 * of the full `puppeteer` bundle used by md-to-pdf locally.
 *
 * Request/response contract (unchanged from the Express server):
 *   POST /api/convert
 *   body: { markdownContent: string, configOptions?: object }
 *   200 -> application/pdf (binary), Content-Disposition: attachment
 *   4xx/5xx -> { error: string }
 */
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { render } = require('../lib/render');

// Reuse the browser across warm invocations to cut cold-start cost.
let browserPromise = null;

async function getBrowser() {
    if (browserPromise) {
        try {
            const b = await browserPromise;
            if (b && b.connected) return b;
        } catch (_) {
            // fall through and relaunch
        }
    }
    browserPromise = puppeteer.launch({
        args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });
    return browserPromise;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Vercel parses JSON bodies automatically, but guard for raw/string bodies.
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    const { markdownContent, configOptions } = body || {};

    if (!markdownContent) {
        return res.status(400).json({ error: 'Markdown content is required' });
    }

    let page;
    try {
        // Resolve relative asset URLs (e.g. ./images/x.png) against the deployed host.
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const baseHref = host ? `${proto}://${host}/` : undefined;

        const { html, pdfOptions } = render(markdownContent, configOptions || {}, { baseHref });

        const browser = await getBrowser();
        page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf(pdfOptions);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=document.pdf');
        return res.status(200).send(Buffer.from(pdf));
    } catch (error) {
        // Log full error server-side; return only the message to the client.
        console.error('Conversion error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error during conversion' });
    } finally {
        if (page) {
            try { await page.close(); } catch (_) { /* ignore */ }
        }
    }
};
