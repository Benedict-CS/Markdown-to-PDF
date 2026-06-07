document.addEventListener('DOMContentLoaded', () => {
    // 1. Core State
    let editor = null;
    let currentPreviewMode = 'web';
    let currentDocId = 'current';
    let currentPdfBlobUrl = null;
    let isUpdating = false;
    let needsUpdate = false;
    let debounceTimer = null;

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

    // 4. Functions
    async function updateWebPreview() {
        const md = editor.getValue();
        if (!md) { elements.webPreview.innerHTML = 'Empty'; return; }
        try {
            const html = (typeof marked.parse === 'function') ? marked.parse(md) : marked(md);
            elements.webPreview.innerHTML = html;
        } catch (e) { elements.webPreview.innerHTML = md; }
    }

    async function requestPDF() {
        const md = editor.getValue().trim();
        if (!md) return null;

        const config = {
            pagination: { 
                enable_auto_page_break: get('auto-page-break').checked, 
                break_before_h1: get('break-h1').checked,
                format: get('page-format').value 
            },
            header_footer: { 
                show_header: get('show-header').checked, 
                header_left: get('header-left-enable').checked ? get('header-left-text').value : '',
                header_right: get('header-right-enable').checked ? get('header-right-text').value : '',
                show_footer: get('show-footer').checked,
                footer_left: get('footer-left-enable').checked ? get('footer-left-text').value : '',
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
            return res.ok ? await res.blob() : null;
        } catch (e) { return null; } finally { elements.loadingSpinner.style.display = 'none'; }
    }

    async function updatePreview() {
        if (isUpdating) { needsUpdate = true; return; }
        updateWebPreview();
        if (currentPreviewMode !== 'pdf') return;

        isUpdating = true;
        needsUpdate = false;
        try {
            const blob = await requestPDF();
            if (blob) {
                if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
                currentPdfBlobUrl = URL.createObjectURL(blob);
                elements.pdfPreview.src = currentPdfBlobUrl;
                elements.pdfPreview.style.display = 'block';
                elements.previewPlaceholder.style.display = 'none';
            }
        } finally {
            isUpdating = false;
            if (needsUpdate) updatePreview();
        }
    }

    function triggerAutoUpdate() {
        updateWebPreview();
        // Save logic
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (docs[currentDocId]) {
            docs[currentDocId].markdown = editor.getValue();
            docs[currentDocId].lastSaved = new Date().toISOString();
            localStorage.setItem('md_docs', JSON.stringify(docs));
        }

        if (!elements.autoUpdate.checked) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updatePreview(), 500);
    }

    function switchMode(mode) {
        currentPreviewMode = mode;
        get('mode-web-btn').classList.toggle('active', mode === 'web');
        get('mode-pdf-btn').classList.toggle('active', mode === 'pdf');
        
        if (mode === 'web') {
            elements.webPreview.style.display = 'block';
            elements.pdfPreview.style.display = 'none';
            elements.previewPlaceholder.style.display = 'none';
        } else {
            elements.webPreview.style.display = 'none';
            if (currentPdfBlobUrl) {
                elements.pdfPreview.style.display = 'block';
                elements.previewPlaceholder.style.display = 'none';
            } else {
                elements.pdfPreview.style.display = 'none';
                elements.previewPlaceholder.style.display = 'block';
                updatePreview();
            }
        }
    }

    // 5. Events
    get('mode-web-btn').onclick = () => switchMode('web');
    get('mode-pdf-btn').onclick = () => switchMode('pdf');
    get('preview-btn').onclick = () => updatePreview();
    
    // Bind settings
    document.querySelectorAll('.settings-content input, .settings-content select').forEach(el => {
        el.onchange = () => triggerAutoUpdate();
        if (el.type === 'text') el.oninput = () => triggerAutoUpdate();
    });

    // 6. Init Load
    const savedDocs = JSON.parse(localStorage.getItem('md_docs') || '{}');
    if (Object.keys(savedDocs).length > 0) {
        const doc = savedDocs[Object.keys(savedDocs)[0]];
        currentDocId = doc.id;
        editor.setValue(doc.markdown || '');
        updatePreview();
    } else {
        fetch('/api/example').then(r => r.text()).then(t => { editor.setValue(t); updatePreview(); });
    }
});
