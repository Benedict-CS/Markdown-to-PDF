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
        // Preview targets
        pdfPreview: get('pdf-preview'),
        webPreview: get('web-preview'),
        previewPlaceholder: document.querySelector('.preview-placeholder'),
        loadingSpinner: get('loading-spinner'),
        statusMsg: get('status-message'),
        
        // Mode Toggles
        modeWebBtn: get('mode-web-btn'),
        modePdfBtn: get('mode-pdf-btn'),
        autoUpdate: get('auto-update'),
        
        // Doc Management
        docSelector: get('doc-selector'),
        newDocBtn: get('new-doc-btn'),
        renameDocBtn: get('rename-doc-btn'),
        deleteDocBtn: get('delete-doc-btn'),
        
        // Settings - Basic
        pageFormat: get('page-format'),
        autoPageBreak: get('auto-page-break'),
        breakH1: get('break-h1'),
        breakH2: get('break-h2'),
        breakH3: get('break-h3'),
        
        // Settings - Header
        showHeader: get('show-header'),
        headerLeftEnable: get('header-left-enable'),
        headerLeftText: get('header-left-text'),
        headerRightEnable: get('header-right-enable'),
        headerRightText: get('header-right-text'),
        
        // Settings - Footer
        showFooter: get('show-footer'),
        footerLeftEnable: get('footer-left-enable'),
        footerLeftText: get('footer-left-text'),
        footerRightEnable: get('footer-right-enable'),
        pageFormatStyle: get('page-format-style'),

        // Action Buttons
        previewBtn: get('preview-btn'),
        convertBtn: get('convert-btn'),
        uploadBtn: get('upload-btn'),
        downloadMDBtn: get('download-md-btn'),
        fileUpload: get('file-upload'),
        loadExampleBtn: get('load-example-btn'),
        clearEditorBtn: get('clear-editor-btn'),
        editorPanel: document.querySelector('.editor-panel')
    };

    // 3. Editor Initialization
    editor = CodeMirror.fromTextArea(get('markdown-input'), {
        mode: 'markdown', 
        lineNumbers: true, 
        theme: 'default', 
        lineWrapping: true,
        extraKeys: {
            "Ctrl-S": (cm) => elements.convertBtn.click(),
            "Ctrl-P": (cm) => updatePreview()
        }
    });
    editor.on('change', () => triggerAutoUpdate());

    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
    }

    // 4. Logic Functions

    async function updateWebPreview() {
        if (!editor || !elements.webPreview) return;
        const md = editor.getValue();
        if (!md) { 
            elements.webPreview.innerHTML = '<div style="color:#aaa; text-align:center; margin-top:2rem;">Start typing to preview...</div>'; 
            return; 
        }
        
        try {
            const options = { breaks: true, gfm: true };
            const html = (typeof marked.parse === 'function') ? marked.parse(md, options) : marked(md, options);
            elements.webPreview.innerHTML = html;
        } catch (e) { elements.webPreview.innerHTML = md; }

        // Local image path fix
        elements.webPreview.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                if (src.startsWith('./')) src = src.substring(2);
                img.src = '/' + src;
            }
        });

        // KaTeX
        if (window.renderMathInElement) {
            renderMathInElement(elements.webPreview, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false}
                ]
            });
        }

        // Mermaid
        if (typeof mermaid !== 'undefined') {
            const blocks = elements.webPreview.querySelectorAll('pre code.language-mermaid');
            for (let block of blocks) {
                const pre = block.parentElement;
                const id = 'mermaid-' + Date.now() + Math.random().toString(36).substr(2, 5);
                try {
                    const { svg } = await mermaid.render(id, block.textContent);
                    pre.outerHTML = `<div class="mermaid-rendered">${svg}</div>`;
                } catch (e) {}
            }
        }
    }

    async function requestPDF() {
        const md = editor.getValue().trim();
        if (!md) return null;

        const config = {
            pagination: { 
                enable_auto_page_break: elements.autoPageBreak.checked, 
                break_before_h1: elements.breakH1.checked,
                format: elements.pageFormat.value 
            },
            header_footer: { 
                show_header: elements.showHeader.checked, 
                header_left: elements.headerLeftEnable.checked ? elements.headerLeftText.value : '',
                header_right: elements.headerRightEnable.checked ? elements.headerRightText.value : '',
                show_footer: elements.showFooter.checked,
                footer_left: elements.footerLeftEnable.checked ? elements.footerLeftText.value : '',
                footer_right: elements.footerRightEnable.checked ? 'PAGE_NUM' : '',
                page_number_format: elements.pageFormatStyle.value
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
        
        await updateWebPreview();
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
                elements.pdfPreview.style.opacity = '1';
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

    function resetPdfPreview() {
        if (currentPdfBlobUrl) {
            URL.revokeObjectURL(currentPdfBlobUrl);
            currentPdfBlobUrl = null;
        }
        elements.pdfPreview.src = 'about:blank';
        elements.pdfPreview.style.display = 'none';
        if (currentPreviewMode === 'pdf') {
            elements.previewPlaceholder.style.display = 'block';
        }
        needsUpdate = false;
    }

    function switchMode(mode) {
        currentPreviewMode = mode;
        elements.modeWebBtn.classList.toggle('active', mode === 'web');
        elements.modePdfBtn.classList.toggle('active', mode === 'pdf');
        
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

    // 5. Persistence
    function saveToLocal() {
        if (!editor) return;
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (!docs[currentDocId]) return;
        
        docs[currentDocId].markdown = editor.getValue();
        docs[currentDocId].lastSaved = new Date().toISOString();
        localStorage.setItem('md_docs', JSON.stringify(docs));

        const settings = {
            pageFormat: elements.pageFormat.value,
            showHeader: elements.showHeader.checked,
            headerLeftEnable: elements.headerLeftEnable.checked,
            headerLeftText: elements.headerLeftText.value,
            headerRightEnable: elements.headerRightEnable.checked,
            headerRightText: elements.headerRightText.value,
            showFooter: elements.showFooter.checked,
            footerLeftEnable: elements.footerLeftEnable.checked,
            footerLeftText: elements.footerLeftText.value,
            footerRightEnable: elements.footerRightEnable.checked,
            pageFormatStyle: elements.pageFormatStyle.value,
            autoPageBreak: elements.autoPageBreak.checked,
            breakH1: elements.breakH1.checked,
            breakH2: elements.breakH2.checked,
            breakH3: elements.breakH3.checked,
            autoUpdate: elements.autoUpdate.checked
        };
        localStorage.setItem('md_pdf_settings', JSON.stringify(settings));

        elements.statusMsg.classList.add('saved');
        elements.statusMsg.textContent = 'Saved';
        setTimeout(() => {
            elements.statusMsg.classList.remove('saved');
            elements.statusMsg.textContent = 'Ready';
        }, 1000);
    }

    function loadFromLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const doc = docs[currentDocId];
        if (doc && editor) editor.setValue(doc.markdown || '');

        const saved = localStorage.getItem('md_pdf_settings');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                elements.pageFormat.value = d.pageFormat || 'A4';
                elements.showHeader.checked = d.showHeader ?? true;
                elements.headerLeftEnable.checked = d.headerLeftEnable ?? true;
                elements.headerLeftText.value = d.headerLeftText || 'Document Title';
                elements.headerRightEnable.checked = d.headerRightEnable ?? false;
                elements.headerRightText.value = d.headerRightText || '';
                elements.showFooter.checked = d.showFooter ?? true;
                elements.footerLeftEnable.checked = d.footerLeftEnable ?? true;
                elements.footerLeftText.value = d.footerLeftText || '© 2026 All Rights Reserved';
                elements.footerRightEnable.checked = d.footerRightEnable ?? true;
                elements.pageFormatStyle.value = d.pageFormatStyle || 'page_of';
                elements.autoPageBreak.checked = d.autoPageBreak ?? true;
                elements.breakH1.checked = d.breakH1 ?? false;
                elements.breakH2.checked = d.breakH2 ?? false;
                elements.breakH3.checked = d.breakH3 ?? false;
                elements.autoUpdate.checked = d.autoUpdate ?? true;
            } catch(e) {}
        }
        updateDocSelector();
        return !!doc;
    }

    function updateDocSelector() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        elements.docSelector.innerHTML = '';
        if (Object.keys(docs).length === 0) {
            const initialId = 'doc_' + Date.now();
            docs[initialId] = { id: initialId, name: 'Primary Draft', markdown: '', lastSaved: new Date().toISOString() };
            localStorage.setItem('md_docs', JSON.stringify(docs));
            currentDocId = initialId;
        }
        Object.keys(docs).sort((a, b) => (docs[b].lastSaved || '').localeCompare(docs[a].lastSaved || '')).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = docs[id].name || 'Untitled Draft';
            if (id === currentDocId) opt.selected = true;
            elements.docSelector.appendChild(opt);
        });
    }

    // 6. Event Bindings
    
    // Mode Buttons
    elements.modeWebBtn.onclick = () => switchMode('web');
    elements.modePdfBtn.onclick = () => switchMode('pdf');
    elements.previewBtn.onclick = () => updatePreview();
    elements.convertBtn.onclick = async () => {
        const blob = await requestPDF();
        if (blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (JSON.parse(localStorage.getItem('md_docs'))[currentDocId]?.name || 'document').toLowerCase() + '.pdf';
            a.click();
        }
    };

    // Doc Management
    elements.docSelector.onchange = (e) => {
        currentDocId = e.target.value;
        loadFromLocal();
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
        loadFromLocal();
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
            loadFromLocal();
            resetPdfPreview();
            updatePreview();
        }
    };

    // Toolbar
    elements.uploadBtn.onclick = () => elements.fileUpload.click();
    elements.fileUpload.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            editor.setValue(ev.target.result);
            resetPdfPreview();
            updatePreview();
        };
        reader.readAsText(file);
    };
    elements.downloadMDBtn.onclick = () => {
        const b = new Blob([editor.getValue()], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = (JSON.parse(localStorage.getItem('md_docs'))[currentDocId]?.name || 'doc').toLowerCase() + '.md';
        a.click();
    };
    elements.loadExampleBtn.onclick = () => {
        if (confirm('Restore example?')) fetch('/api/example').then(r => r.text()).then(t => { editor.setValue(t); resetPdfPreview(); updatePreview(); });
    };
    elements.clearEditorBtn.onclick = () => { if (confirm('Clear?')) { editor.setValue(''); resetPdfPreview(); updatePreview(); } };

    // All Settings (Granular Binding)
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(el => {
        const type = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(type, () => triggerAutoUpdate());
    });

    // Zoom
    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const size = btn.dataset.size;
            [elements.webPreview, elements.pdfPreview].forEach(target => {
                target.style.transform = 'scale(1)';
                if (size === 'fit') { target.style.width = '100%'; target.style.margin = '0'; target.style.boxShadow = 'none'; }
                else { target.style.width = size + '%'; target.style.margin = '2rem auto'; if (target === elements.webPreview) target.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)'; }
            });
        });
    });

    // 7. Initial Load
    const initialDocs = JSON.parse(localStorage.getItem('md_docs') || '{}');
    if (Object.keys(initialDocs).length > 0) {
        currentDocId = Object.keys(initialDocs)[0];
        loadFromLocal();
        updatePreview();
    } else {
        fetch('/api/example').then(r => r.text()).then(t => { editor.setValue(t); updatePreview(); });
    }
    switchMode('web');
});
