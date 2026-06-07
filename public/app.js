document.addEventListener('DOMContentLoaded', () => {
    // Initialize CodeMirror Editor
    const editor = CodeMirror.fromTextArea(document.getElementById('markdown-input'), {
        mode: 'markdown',
        lineNumbers: true,
        theme: 'default',
        lineWrapping: true,
        extraKeys: {
            "Ctrl-S": (cm) => document.getElementById('convert-btn').click(),
            "Ctrl-P": (cm) => updatePreview()
        }
    });

    // Mermaid Initialization
    mermaid.initialize({ startOnLoad: false, theme: 'default' });

    const previewBtn = document.getElementById('preview-btn');
    const convertBtn = document.getElementById('convert-btn');
    const statusMsg = document.getElementById('status-message');
    const pdfPreview = document.getElementById('pdf-preview');
    const webPreview = document.getElementById('web-preview');
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // Preview Mode Toggles
    const modeWebBtn = document.getElementById('mode-web-btn');
    const modePdfBtn = document.getElementById('mode-pdf-btn');
    let currentPreviewMode = 'web'; // Default to instant web mode

    // Controls
    const pageFormat = document.getElementById('page-format');
    const showHeader = document.getElementById('show-header');
    const headerTitle = document.getElementById('header-title');
    const showPageNumbers = document.getElementById('show-page-numbers');
    const pageFormatStyle = document.getElementById('page-format-style');
    const showCopyright = document.getElementById('show-copyright');
    const copyrightText = document.getElementById('copyright-text');
    const autoPageBreak = document.getElementById('auto-page-break');
    const breakH1 = document.getElementById('break-h1');
    const breakH2 = document.getElementById('break-h2');
    const breakH3 = document.getElementById('break-h3');
    
    const autoUpdateToggle = document.getElementById('auto-update');
    const loadExampleBtn = document.getElementById('load-example-btn');
    const clearEditorBtn = document.getElementById('clear-editor-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const downloadMDBtn = document.getElementById('download-md-btn');
    const fileUpload = document.getElementById('file-upload');
    const editorPanel = document.querySelector('.editor-panel');
    const docSelector = document.getElementById('doc-selector');
    const renameDocBtn = document.getElementById('rename-doc-btn');
    const deleteDocBtn = document.getElementById('delete-doc-btn');
    const newDocBtn = document.getElementById('new-doc-btn');

    let debounceTimer = null;
    let currentDocId = 'current';

    /**
     * Preview Mode Switching
     */
    function resetPdfPreview() {
        pdfPreview.src = '';
        pdfPreview.style.display = 'none';
        if (currentPreviewMode === 'pdf') {
            previewPlaceholder.style.display = 'block';
        }
    }

    function switchPreviewMode(mode) {
        currentPreviewMode = mode;
        modeWebBtn.classList.toggle('active', mode === 'web');
        modePdfBtn.classList.toggle('active', mode === 'pdf');

        if (mode === 'web') {
            webPreview.style.display = 'block';
            pdfPreview.style.display = 'none';
            previewPlaceholder.style.display = 'none';
            updateWebPreview();
        } else {
            webPreview.style.display = 'none';
            if (pdfPreview.src && pdfPreview.src.startsWith('blob:')) {
                pdfPreview.style.display = 'block';
                previewPlaceholder.style.display = 'none';
            } else {
                pdfPreview.style.display = 'none';
                previewPlaceholder.style.display = 'block';
                updatePreview();
            }
        }
    }

    modeWebBtn.addEventListener('click', () => switchPreviewMode('web'));
    modePdfBtn.addEventListener('click', () => switchPreviewMode('pdf'));

    /**
     * Instant Web Preview (Marked.js + KaTeX + Mermaid)
     */
    async function updateWebPreview() {
        const markdown = editor.getValue();
        if (!markdown) {
            webPreview.innerHTML = '<div style="color:#aaa; text-align:center; margin-top:2rem;">Start typing to preview...</div>';
            return;
        }

        marked.setOptions({ breaks: true, gfm: true });
        webPreview.innerHTML = marked.parse(markdown);

        // Fix image paths
        const images = webPreview.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                img.src = '/' + src;
            }
        });

        // Render Math
        if (window.renderMathInElement) {
            renderMathInElement(webPreview, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false}
                ]
            });
        }

        // Render Mermaid
        const mermaidBlocks = webPreview.querySelectorAll('pre code.language-mermaid');
        for (let block of mermaidBlocks) {
            const pre = block.parentElement;
            const content = block.textContent;
            const id = 'mermaid-' + Date.now() + Math.random().toString(36).substr(2, 5);
            try {
                const { svg } = await mermaid.render(id, content);
                pre.outerHTML = `<div class="mermaid-rendered">${svg}</div>`;
            } catch (e) { console.error('Mermaid error', e); }
        }
    }

    /**
     * Persistence
     */
    function saveToLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (!docs[currentDocId]) {
            docs[currentDocId] = { id: currentDocId, name: currentDocId === 'current' ? 'Primary Draft' : 'Untitled Draft' };
        }
        docs[currentDocId].markdown = editor.getValue();
        docs[currentDocId].lastSaved = new Date().toISOString();
        localStorage.setItem('md_docs', JSON.stringify(docs));

        const settings = {
            pageFormat: pageFormat.value, showHeader: showHeader.checked, headerTitle: headerTitle.value,
            showPageNumbers: showPageNumbers.checked, pageFormatStyle: pageFormatStyle.value,
            showCopyright: showCopyright.checked, copyright_text: copyrightText.value,
            autoPageBreak: autoPageBreak.checked, breakH1: breakH1.checked, breakH2: breakH2.checked, breakH3: breakH3.checked
        };
        localStorage.setItem('md_pdf_settings', JSON.stringify(settings));
        
        statusMsg.classList.add('saved');
        setTimeout(() => statusMsg.classList.remove('saved'), 1000);
    }

    function loadFromLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const doc = docs[currentDocId];
        if (doc) editor.setValue(doc.markdown || '');

        const saved = localStorage.getItem('md_pdf_settings');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                pageFormat.value = d.pageFormat || 'A4';
                showHeader.checked = d.showHeader ?? false;
                headerTitle.value = d.headerTitle || '';
                showPageNumbers.checked = d.showPageNumbers ?? true;
                pageFormatStyle.value = d.pageFormatStyle || 'page_of';
                showCopyright.checked = d.showCopyright ?? true;
                copyrightText.value = d.copyright_text || '';
                autoPageBreak.checked = d.autoPageBreak ?? true;
                breakH1.checked = d.breakH1 ?? false;
                breakH2.checked = d.breakH2 ?? false;
                breakH3.checked = d.breakH3 ?? false;
            } catch(e) {}
        }
        updateDocSelector();
        return !!doc;
    }

    function updateDocSelector() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        docSelector.innerHTML = '';
        if (Object.keys(docs).length === 0) {
            docs['current'] = { id: 'current', name: 'Primary Draft', markdown: '', lastSaved: new Date().toISOString() };
            localStorage.setItem('md_docs', JSON.stringify(docs));
            currentDocId = 'current';
        }
        Object.keys(docs).sort((a, b) => (docs[b].lastSaved || '').localeCompare(docs[a].lastSaved || '')).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = docs[id].name || 'Untitled Draft';
            if (id === currentDocId) opt.selected = true;
            docSelector.appendChild(opt);
        });
    }

    docSelector.addEventListener('change', (e) => {
        currentDocId = e.target.value;
        loadFromLocal();
        resetPdfPreview();
        updatePreview();
    });

    renameDocBtn.addEventListener('click', () => {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const newName = prompt('Rename document:', docs[currentDocId]?.name || '');
        if (newName) {
            docs[currentDocId].name = newName;
            localStorage.setItem('md_docs', JSON.stringify(docs));
            updateDocSelector();
            updateStatus('Renamed');
        }
    });

    deleteDocBtn.addEventListener('click', () => {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (Object.keys(docs).length <= 1) return alert('Cannot delete last doc.');
        if (confirm('Delete?')) {
            delete docs[currentDocId];
            localStorage.setItem('md_docs', JSON.stringify(docs));
            currentDocId = Object.keys(docs)[0];
            loadFromLocal();
            resetPdfPreview();
            updatePreview();
        }
    });

    newDocBtn.addEventListener('click', () => {
        const name = prompt('Name:');
        if (name === null) return;
        const id = 'doc_' + Date.now();
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        docs[id] = { id, name: name || 'Untitled', markdown: '', lastSaved: new Date().toISOString() };
        localStorage.setItem('md_docs', JSON.stringify(docs));
        currentDocId = id;
        loadFromLocal();
        resetPdfPreview();
        updatePreview();
    });

    function handleFile(file) {
        if (!file || !file.name.endsWith('.md')) return;
        const r = new FileReader();
        r.onload = (e) => { 
            editor.setValue(e.target.result); 
            resetPdfPreview();
            updatePreview(); 
        };
        r.readAsText(file);
    }
    uploadBtn.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', (e) => handleFile(e.target.files[0]));
    downloadMDBtn.addEventListener('click', () => {
        const b = new Blob([editor.getValue()], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = (docs[currentDocId]?.name || 'doc').toLowerCase() + '.md';
        a.click();
    });

    editorPanel.addEventListener('dragover', (e) => { e.preventDefault(); editorPanel.classList.add('drag-over'); });
    editorPanel.addEventListener('dragleave', () => editorPanel.classList.remove('drag-over'));
    editorPanel.addEventListener('drop', (e) => {
        e.preventDefault(); editorPanel.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    async function loadExample() {
        const res = await fetch('/api/example');
        if (res.ok) { 
            editor.setValue(await res.text()); 
            resetPdfPreview();
            updatePreview(); 
        }
    }

    if (Object.keys(JSON.parse(localStorage.getItem('md_docs') || '{}')).length === 0) loadExample();
    else { loadFromLocal(); updatePreview(); }

    loadExampleBtn.addEventListener('click', () => { if (confirm('Restore?')) loadExample(); });
    clearEditorBtn.addEventListener('click', () => { 
        if (confirm('Clear?')) { 
            editor.setValue(''); 
            resetPdfPreview();
            updatePreview(); 
        } 
    });

    async function requestPDF() {
        const markdown = editor.getValue().trim();
        if (!markdown) return null;
        const config = {
            pagination: { enable_auto_page_break: autoPageBreak.checked, break_before_h1: breakH1.checked, break_before_h2: breakH2.checked, break_before_h3: breakH3.checked, format: pageFormat.value },
            header_footer: { show_header: showHeader.checked, header_title: headerTitle.value, show_copyright: showCopyright.checked, copyright_text: copyrightText.value, show_page_numbers: showPageNumbers.checked, page_number_format: pageFormatStyle.value }
        };
        try {
            loadingSpinner.style.display = 'block';
            const res = await fetch('/api/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markdownContent: markdown, configOptions: config }) });
            return res.ok ? await res.blob() : null;
        } catch (e) { return null; } finally { loadingSpinner.style.display = 'none'; }
    }

    async function updatePreview() {
        updateWebPreview();
        if (currentPreviewMode === 'pdf') {
            const blob = await requestPDF();
            if (blob) { pdfPreview.src = URL.createObjectURL(blob); pdfPreview.style.display = 'block'; previewPlaceholder.style.display = 'none'; }
        }
    }

    convertBtn.addEventListener('click', async () => {
        const blob = await requestPDF();
        if (blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'doc.pdf'; a.click(); }
    });

    previewBtn.addEventListener('click', () => { switchPreviewMode('pdf'); });

    function triggerAutoUpdate() {
        updateWebPreview();
        saveToLocal();
        if (!autoUpdateToggle.checked) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { if (currentPreviewMode === 'pdf') updatePreview(); }, 500);
    }

    editor.on('change', triggerAutoUpdate);
    [pageFormat, showHeader, headerTitle, showPageNumbers, pageFormatStyle, showCopyright, copyrightText, autoPageBreak, breakH1, breakH2, breakH3].forEach(i => {
        i.addEventListener(i.type === 'text' ? 'input' : 'change', triggerAutoUpdate);
    });

    function updateStatus(text, isError = false) {
        statusMsg.textContent = text; statusMsg.classList.toggle('error', isError);
        statusMsg.style.transform = 'scale(1.05)'; setTimeout(() => { statusMsg.style.transform = 'scale(1)'; }, 200);
    }

    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = currentPreviewMode === 'web' ? webPreview : pdfPreview;
            if (btn.dataset.size === 'fit') { target.style.width = '100%'; target.style.transform = 'scale(1)'; }
            else { const s = parseInt(btn.dataset.size) / 100; target.style.width = (100 / s) + '%'; target.style.transform = `scale(${s})`; }
        });
    });
    switchPreviewMode('web');
});
