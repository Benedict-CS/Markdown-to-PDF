document.addEventListener('DOMContentLoaded', () => {
    // 1. Core State
    let editor = null;
    let currentPreviewMode = 'web';
    let currentDocId = 'current';
    let currentPdfBlobUrl = null;
    let isUpdating = false;
    let needsUpdate = false;
    let debounceTimer = null;

    // 2. DOM Elements Mapping
    const get = (id) => document.getElementById(id);
    const elements = {
        pdfPreview: get('pdf-preview'),
        webPreview: get('web-preview'),
        previewPlaceholder: document.querySelector('.preview-placeholder'),
        loadingSpinner: get('loading-spinner'),
        statusMsg: get('status-message'),
        autoUpdate: get('auto-update'),
        docSelector: get('doc-selector'),
        newDocBtn: get('new-doc-btn'),
        renameDocBtn: get('rename-doc-btn'),
        deleteDocBtn: get('delete-doc-btn'),
        uploadBtn: get('upload-btn'),
        imageBtn: get('image-btn'),
        downloadMDBtn: get('download-md-btn'),
        fileUpload: get('file-upload'),
        imageUpload: get('image-upload'),
        loadExampleBtn: get('load-example-btn'),
        clearEditorBtn: get('clear-editor-btn'),
        modeWebBtn: get('mode-web-btn'),
        modePdfBtn: get('mode-pdf-btn'),
        previewBtn: get('preview-btn'),
        convertBtn: get('convert-btn')
    };

    // 3. Editor Init
    editor = CodeMirror.fromTextArea(get('markdown-input'), {
        mode: 'markdown', 
        lineNumbers: true, 
        theme: 'default', 
        lineWrapping: true
    });
    
    editor.on('change', () => {
        triggerAutoUpdate();
    });

    // 4. Functions
    async function updateWebPreview() {
        if (!editor) return;
        const md = editor.getValue();
        if (!md) { 
            elements.webPreview.innerHTML = '<div style="color:#aaa; text-align:center; margin-top:2rem;">Start writing...</div>'; 
            return; 
        }
        try {
            const html = (typeof marked.parse === 'function') ? marked.parse(md) : marked(md);
            elements.webPreview.innerHTML = html;
        } catch (e) { elements.webPreview.innerHTML = md; }

        // Local Image Path Fix
        elements.webPreview.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src');
            if (src && src.startsWith('./images/')) img.src = src.substring(1);
        });
    }

    async function requestPDF() {
        if (!editor) return null;
        const md = editor.getValue().trim();
        if (!md) return null;

        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const docName = docs[currentDocId]?.name || 'Untitled';
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const processText = (str) => (str || '').replace(/{title}/g, docName).replace(/{date}/g, today).replace(/{time}/g, time);

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
        } catch (e) { 
            console.error("PDF Request failed:", e);
            return null; 
        } finally { 
            elements.loadingSpinner.style.display = 'none'; 
        }
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
                currentPdfBlobUrl = URL.createObjectURL(blob);
                elements.pdfPreview.src = 'about:blank';
                setTimeout(() => {
                    elements.pdfPreview.src = currentPdfBlobUrl + '#view=FitH';
                    elements.pdfPreview.style.display = 'block';
                    if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
                    applyZoomStyles();
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
        
        elements.statusMsg.classList.add('saved');
        elements.statusMsg.textContent = 'Saved';
        setTimeout(() => { elements.statusMsg.classList.remove('saved'); elements.statusMsg.textContent = 'Ready'; }, 1000);
    }

    function updateDocSelector() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        elements.docSelector.innerHTML = '';
        Object.keys(docs).sort((a, b) => (docs[b].lastSaved || '').localeCompare(docs[a].lastSaved || '')).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = docs[id].name || 'Untitled Draft';
            if (id === currentDocId) opt.selected = true;
            elements.docSelector.appendChild(opt);
        });
    }

    function switchMode(mode) {
        currentPreviewMode = mode;
        elements.modeWebBtn.classList.toggle('active', mode === 'web');
        elements.modePdfBtn.classList.toggle('active', mode === 'pdf');
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
        if (!elements.pdfPreview || !elements.webPreview) return;
        elements.webPreview.style.width = '100%';
        elements.webPreview.style.margin = '0';
        elements.pdfPreview.style.width = '100%';
        elements.pdfPreview.style.margin = '0';
    }

    function resetPdfPreview() {
        if (currentPdfBlobUrl) { URL.revokeObjectURL(currentPdfBlobUrl); currentPdfBlobUrl = null; }
        elements.pdfPreview.src = 'about:blank';
        elements.pdfPreview.style.display = 'none';
        if (currentPreviewMode === 'pdf') elements.previewPlaceholder.style.display = 'block';
        needsUpdate = false;
    }

    // 5. Explicit Binding
    elements.modeWebBtn.onclick = () => switchMode('web');
    elements.modePdfBtn.onclick = () => switchMode('pdf');
    elements.previewBtn.onclick = () => updatePreview(true);
    elements.convertBtn.onclick = async () => {
        const blob = await requestPDF();
        if (blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
            a.download = (docs[currentDocId]?.name || 'document').toLowerCase() + '.pdf';
            a.click();
        }
    };

    elements.docSelector.onchange = (e) => {
        currentDocId = e.target.value;
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        editor.setValue(docs[currentDocId]?.markdown || '');
        resetPdfPreview();
        updatePreview();
    };

    elements.newDocBtn.onclick = () => {
        const name = prompt('Document Name:');
        if (name === null) return;
        const id = 'doc_' + Date.now();
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        docs[id] = { id, name: name || 'Untitled', markdown: `# ${name || 'Untitled'}\n\nStart writing...`, lastSaved: new Date().toISOString() };
        localStorage.setItem('md_docs', JSON.stringify(docs));
        currentDocId = id;
        editor.setValue(docs[id].markdown);
        updateDocSelector();
        resetPdfPreview();
        updatePreview();
    };

    elements.renameDocBtn.onclick = () => {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const newName = prompt('New Name:', docs[currentDocId]?.name);
        if (newName) {
            docs[currentDocId].name = newName;
            localStorage.setItem('md_docs', JSON.stringify(docs));
            updateDocSelector();
        }
    };

    elements.deleteDocBtn.onclick = () => {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (Object.keys(docs).length <= 1) return alert('Keep at least one doc.');
        if (confirm('Delete current document?')) {
            delete docs[currentDocId];
            localStorage.setItem('md_docs', JSON.stringify(docs));
            currentDocId = Object.keys(docs)[0];
            editor.setValue(docs[currentDocId].markdown || '');
            updateDocSelector();
            resetPdfPreview();
            updatePreview();
        }
    };

    // Toolbar Actions
    elements.uploadBtn.onclick = () => elements.fileUpload.click();
    elements.fileUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = (ev) => { editor.setValue(ev.target.result); resetPdfPreview(); updatePreview(); };
        r.readAsText(file);
    };

    // --- IMAGE UPLOAD LOGIC ---
    elements.imageBtn.onclick = () => elements.imageUpload.click();
    elements.imageUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const r = new FileReader();
        r.onload = async (ev) => {
            const base64Data = ev.target.result.split(',')[1];
            const fileName = file.name.replace(/\s+/g, '_');
            
            try {
                elements.loadingSpinner.style.display = 'block';
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName, base64Data })
                });
                const data = await res.json();
                if (data.success) {
                    const snippet = `\n![${file.name}](${data.path})\n`;
                    editor.replaceSelection(snippet);
                    triggerAutoUpdate();
                } else {
                    alert('Upload failed: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('Image upload failed:', err);
                alert('Server Error during image upload');
            } finally {
                elements.loadingSpinner.style.display = 'none';
                elements.imageUpload.value = ''; // Reset input
            }
        };
        r.readAsDataURL(file);
    };

    elements.downloadMDBtn.onclick = () => {
        const b = new Blob([editor.getValue()], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        a.download = (docs[currentDocId]?.name || 'doc').toLowerCase() + '.md';
        a.click();
    };
    elements.loadExampleBtn.onclick = () => {
        if (confirm('Restore example?')) fetch('/api/example').then(r => r.text()).then(t => { editor.setValue(t); resetPdfPreview(); updatePreview(); });
    };
    elements.clearEditorBtn.onclick = () => { if (confirm('Clear editor?')) { editor.setValue(''); resetPdfPreview(); updatePreview(); } };

    document.querySelectorAll('.settings-content input, .settings-content select, #auto-update').forEach(el => {
        const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(ev, () => triggerAutoUpdate());
    });

    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (currentPreviewMode === 'pdf' && currentPdfBlobUrl) {
                elements.pdfPreview.src = 'about:blank';
                setTimeout(() => { elements.pdfPreview.src = currentPdfBlobUrl + '#view=FitH'; applyZoomStyles(); }, 10);
            } else { applyZoomStyles(); }
        });
    });

    // 6. Init
    const savedDocs = JSON.parse(localStorage.getItem('md_docs') || '{}');
    if (Object.keys(savedDocs).length > 0) {
        currentDocId = Object.keys(savedDocs)[0];
        editor.setValue(savedDocs[currentDocId].markdown || '');
        updateDocSelector();
    } else {
        fetch('/api/example').then(r => r.text()).then(t => { 
            editor.setValue(t); 
            const id = 'doc_' + Date.now();
            const docs = {}; docs[id] = { id, name: 'Primary Draft', markdown: t, lastSaved: new Date().toISOString() };
            localStorage.setItem('md_docs', JSON.stringify(docs));
            currentDocId = id;
            updateDocSelector();
        });
    }
    
    applyZoomStyles();
    updatePreview();
});
