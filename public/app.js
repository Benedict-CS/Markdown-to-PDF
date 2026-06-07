document.addEventListener('DOMContentLoaded', () => {
    // 1. State
    let editor = null;
    let currentPreviewMode = 'web';
    let currentDocId = 'current';
    let currentPdfBlobUrl = null;
    let isUpdating = false;
    let needsUpdate = false;
    let debounceTimer = null;
    let currentZoom = '100'; // Default zoom state

    // 2. DOM Elements
    const get = (id) => document.getElementById(id);
    const elements = {
        pdfPreview: get('pdf-preview'),
        webPreview: get('web-preview'),
        previewPlaceholder: document.querySelector('.preview-placeholder'),
        loadingSpinner: get('loading-spinner'),
        statusMsg: get('status-message'),
        autoUpdate: get('auto-update'),
        docSelector: get('doc-selector')
    };

    // 3. Editor Init
    editor = CodeMirror.fromTextArea(get('markdown-input'), {
        mode: 'markdown', lineNumbers: true, theme: 'default', lineWrapping: true
    });
    editor.on('change', () => triggerAutoUpdate());

    // 4. Logic Functions
    async function updateWebPreview() {
        const md = editor.getValue();
        if (!md) { elements.webPreview.innerHTML = '<div style="color:#aaa; text-align:center; margin-top:2rem;">Start typing...</div>'; return; }
        try {
            const html = (typeof marked.parse === 'function') ? marked.parse(md) : marked(md);
            elements.webPreview.innerHTML = html;
        } catch (e) { elements.webPreview.innerHTML = md; }

        elements.webPreview.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src');
            if (src && src.startsWith('./images/')) img.src = src.substring(1);
        });
    }

    async function requestPDF() {
        const md = editor.getValue().trim();
        if (!md) return null;

        const today = new Date().toISOString().split('T')[0];
        const processText = (str) => (str || '').replace(/{date}/g, today);

        const config = {
            pagination: { 
                enable_auto_page_break: get('auto-page-break').checked, 
                break_before_h1: get('break-h1').checked,
                break_before_h2: get('break-h2').checked,
                break_before_h3: get('break-h3').checked,
                format: 'A4' 
            },
            header_footer: { 
                show_header: get('show-header').checked, 
                header_left: get('header-left-enable').checked ? processText(get('header-left-text').value) : '',
                header_right: get('header-right-enable').checked ? processText(get('header-right-text').value) : '',
                show_footer: get('show-footer').checked,
                footer_left: get('footer-left-enable').checked ? processText(get('footer-left-text').value) : '',
                footer_right: get('footer-right-enable').checked ? 'PAGE_NUM' : '',
                page_number_format: get('page-format-style').value
            }
        };

        try {
            elements.loadingSpinner.style.display = 'block';
            const res = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdownContent: md, configOptions: config })
            });
            if (!res.ok) throw new Error("Server error");
            return await res.blob();
        } catch (e) { console.error("PDF Error:", e); return null; }
        finally { elements.loadingSpinner.style.display = 'none'; }
    }

    async function updatePreview(force = false) {
        if (isUpdating) { needsUpdate = true; return; }
        updateWebPreview();
        if (currentPreviewMode !== 'pdf' && !force) return;

        isUpdating = true;
        needsUpdate = false;
        try {
            const blob = await requestPDF();
            if (blob) {
                if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
                // Force FitH (Fit Horizontal) in PDF viewer
                currentPdfBlobUrl = URL.createObjectURL(blob);
                elements.pdfPreview.src = 'about:blank';
                setTimeout(() => {
                    elements.pdfPreview.src = currentPdfBlobUrl + '#view=FitH';
                    elements.pdfPreview.style.display = 'block';
                    if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
                    applyZoomStyles(); // Re-apply zoom to new iframe
                }, 50);
            }
        } finally {
            isUpdating = false;
            if (needsUpdate) updatePreview();
        }
    }

    function triggerAutoUpdate() {
        updateWebPreview();
        saveToLocal();
        if (!elements.autoUpdate.checked) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updatePreview(), 500);
    }

    function saveToLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (docs[currentDocId]) {
            docs[currentDocId].markdown = editor.getValue();
            docs[currentDocId].lastSaved = new Date().toISOString();
            localStorage.setItem('md_docs', JSON.stringify(docs));
        }
    }

    function switchMode(mode) {
        currentPreviewMode = mode;
        get('mode-web-btn').classList.toggle('active', mode === 'web');
        get('mode-pdf-btn').classList.toggle('active', mode === 'pdf');
        if (mode === 'web') {
            elements.webPreview.style.display = 'block';
            elements.pdfPreview.style.display = 'none';
            if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
        } else {
            elements.webPreview.style.display = 'none';
            updatePreview(true);
        }
    }

    function applyZoomStyles() {
        [elements.webPreview, elements.pdfPreview].forEach(target => {
            if (!target) return;
            if (currentZoom === 'fit') {
                target.style.width = '100%';
                target.style.margin = '0';
                target.style.boxShadow = 'none';
            } else {
                target.style.width = '210mm';
                target.style.margin = '2rem auto';
                target.style.boxShadow = '0 0 30px rgba(0,0,0,0.25)';
                if (target === elements.pdfPreview) target.style.backgroundColor = '#fff';
            }
        });
    }

    // 5. Events
    get('mode-web-btn').onclick = () => switchMode('web');
    get('mode-pdf-btn').onclick = () => switchMode('pdf');
    get('preview-btn').onclick = () => updatePreview(true);

    document.querySelectorAll('.settings-content input, .settings-content select, #auto-update').forEach(el => {
        const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(ev, () => triggerAutoUpdate());
    });

    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentZoom = btn.dataset.size;
            applyZoomStyles();
        });
    });

    // 6. Init Load
    const savedDocs = JSON.parse(localStorage.getItem('md_docs') || '{}');
    if (Object.keys(savedDocs).length > 0) {
        currentDocId = Object.keys(savedDocs)[0];
        editor.setValue(savedDocs[currentDocId].markdown || '');
    } else {
        fetch('/api/example').then(r => r.text()).then(t => { 
            editor.setValue(t); 
            // Ensure first doc has a name if empty
            const initialDocs = JSON.parse(localStorage.getItem('md_docs') || '{}');
            if (Object.keys(initialDocs).length === 0) {
                const id = 'doc_' + Date.now();
                initialDocs[id] = { id, name: 'Primary Draft', markdown: t, lastSaved: new Date().toISOString() };
                localStorage.setItem('md_docs', JSON.stringify(initialDocs));
                currentDocId = id;
            }
        });
    }
    
    // Initial Zoom Setup
    const defaultZoomBtn = document.querySelector('.zoom-btn[data-size="100"]');
    if (defaultZoomBtn) defaultZoomBtn.click();

    updatePreview();
});
