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
    const updateDelaySelect = document.getElementById('update-delay');
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
            // Only show PDF if it has content, otherwise placeholder
            if (pdfPreview.src && pdfPreview.src.startsWith('blob:')) {
                pdfPreview.style.display = 'block';
                previewPlaceholder.style.display = 'none';
            } else {
                pdfPreview.style.display = 'none';
                previewPlaceholder.style.display = 'block';
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

        // Configure marked to handle relative images correctly
        marked.setOptions({
            breaks: true,
            gfm: true
        });

        // Render HTML
        webPreview.innerHTML = marked.parse(markdown);

        // Fix image paths in web preview (ensure relative images in markdown work)
        const images = webPreview.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            // If it's a relative path and doesn't start with /
            if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                // Prepend / to make it relative to root where images/ folder lives
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
                const { render } = mermaid;
                const { svg } = await render(id, content);
                pre.outerHTML = `<div class="mermaid-rendered">${svg}</div>`;
            } catch (e) {
                console.error('Mermaid render error', e);
            }
        }
    }

    /**
     * Persistence: Save content and settings to localStorage
     */
    function saveToLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (!docs[currentDocId]) {
            docs[currentDocId] = { id: currentDocId, name: currentDocId === 'current' ? 'Primary Draft' : 'Untitled Draft' };
        }
        docs[currentDocId].markdown = editor.getValue();
        docs[currentDocId].lastSaved = new Date().toISOString();
        localStorage.setItem('md_docs', JSON.stringify(docs));

        const globalSettings = {
            pageFormat: pageFormat.value,
            showHeader: showHeader.checked,
            headerTitle: headerTitle.value,
            showPageNumbers: showPageNumbers.checked,
            pageFormatStyle: pageFormatStyle.value,
            showCopyright: showCopyright.checked,
            copyright_text: copyrightText.value,
            autoPageBreak: autoPageBreak.checked,
            breakH1: breakH1.checked,
            breakH2: breakH2.checked,
            breakH3: breakH3.checked
        };
        localStorage.setItem('md_pdf_settings', JSON.stringify(globalSettings));
        
        statusMsg.classList.add('saved');
        setTimeout(() => statusMsg.classList.remove('saved'), 1000);
    }

    /**
     * Get a clean filename
     */
    function getExportFilename(extension) {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        let name = docs[currentDocId]?.name;
        if (!name || name === 'Primary Draft' || name === 'Untitled Draft') {
            const match = editor.getValue().match(/^#\s+(.+)$/m);
            name = match ? match[1].trim() : 'document';
        }
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + extension;
    }

    /**
     * Persistence: Load content and settings from localStorage
     */
    function loadFromLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const doc = docs[currentDocId];
        if (doc) {
            editor.setValue(doc.markdown || '');
        }

        const savedSettings = localStorage.getItem('md_pdf_settings');
        if (savedSettings) {
            try {
                const data = JSON.parse(savedSettings);
                pageFormat.value = data.pageFormat || 'A4';
                showHeader.checked = data.showHeader ?? false;
                headerTitle.value = data.headerTitle || '';
                showPageNumbers.checked = data.showPageNumbers ?? true;
                pageFormatStyle.value = data.pageFormatStyle || 'page_of';
                showCopyright.checked = data.showCopyright ?? true;
                copyrightText.value = data.copyright_text || '';
                autoPageBreak.checked = data.autoPageBreak ?? true;
                breakH1.checked = data.breakH1 ?? false;
                breakH2.checked = data.breakH2 ?? false;
                breakH3.checked = data.breakH3 ?? false;
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
            opt.textContent = docs[id].name || (id === 'current' ? 'Primary Draft' : 'Untitled Draft');
            if (id === currentDocId) opt.selected = true;
            docSelector.appendChild(opt);
        });
    }

    docSelector.addEventListener('change', (e) => {
        currentDocId = e.target.value;
        loadFromLocal();
        updatePreview();
    });

    renameDocBtn.addEventListener('click', () => {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const oldName = docs[currentDocId]?.name || 'Untitled Draft';
        const newName = prompt('Rename document:', oldName);
        if (newName && newName !== oldName) {
            docs[currentDocId].name = newName;
            localStorage.setItem('md_docs', JSON.stringify(docs));
            updateDocSelector();
            updateStatus(`Renamed to "${newName}"`);
        }
    });

    deleteDocBtn.addEventListener('click', () => {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (Object.keys(docs).length <= 1) {
            alert('Cannot delete the last document.');
            return;
        }
        if (confirm(`Permanently delete "${docs[currentDocId]?.name || 'this document'}"?`)) {
            delete docs[currentDocId];
            localStorage.setItem('md_docs', JSON.stringify(docs));
            currentDocId = Object.keys(docs)[0];
            loadFromLocal();
            updatePreview();
            updateStatus('Document deleted.');
        }
    });

    newDocBtn.addEventListener('click', () => {
        const docName = prompt('Enter a name:', `Draft ${new Date().toLocaleTimeString()}`);
        if (docName === null) return;
        const newId = 'doc_' + Date.now();
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        docs[newId] = { id: newId, name: docName || 'Untitled Draft', markdown: '', lastSaved: new Date().toISOString() };
        localStorage.setItem('md_docs', JSON.stringify(docs));
        currentDocId = newId;
        loadFromLocal();
        updatePreview();
    });

    /**
     * File Actions
     */
    function handleFile(file) {
        if (!file || !file.name.endsWith('.md')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            editor.setValue(e.target.result);
            updatePreview();
        };
        reader.readAsText(file);
    }
    uploadBtn.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', (e) => handleFile(e.target.files[0]));

    downloadMDBtn.addEventListener('click', () => {
        const blob = new Blob([editor.getValue()], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = getExportFilename('md');
        a.click();
    });

    editorPanel.addEventListener('dragover', (e) => { e.preventDefault(); editorPanel.classList.add('drag-over'); });
    editorPanel.addEventListener('dragleave', () => editorPanel.classList.remove('drag-over'));
    editorPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        editorPanel.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    async function loadExample() {
        try {
            const response = await fetch('/api/example');
            if (response.ok) {
                const text = await response.text();
                editor.setValue(text);
                updatePreview();
            }
        } catch (e) {}
    }

    if (Object.keys(JSON.parse(localStorage.getItem('md_docs') || '{}')).length === 0) {
        loadExample();
    } else {
        loadFromLocal();
        updatePreview();
    }

    loadExampleBtn.addEventListener('click', () => { if (confirm('Restore example?')) loadExample(); });
    clearEditorBtn.addEventListener('click', () => {
        if (confirm('Clear everything?')) {
            editor.setValue('');
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
            const response = await fetch('/api/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markdownContent: markdown, configOptions: config }) });
            if (!response.ok) throw new Error();
            return await response.blob();
        } catch (e) {
            updateStatus('Error generating PDF.', true);
            return null;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    async function updatePreview() {
        // ALWAYS update Web Preview instantly
        updateWebPreview();

        // PDF Preview logic
        if (currentPreviewMode === 'pdf') {
            const markdown = editor.getValue().trim();
            if (!markdown) {
                pdfPreview.style.display = 'none';
                previewPlaceholder.style.display = 'block';
                return;
            }
            updateStatus('Updating PDF...');
            const blob = await requestPDF();
            if (blob) {
                pdfPreview.src = window.URL.createObjectURL(blob);
                pdfPreview.style.display = 'block';
                previewPlaceholder.style.display = 'none';
                updateStatus('PDF updated!');
            }
        }
    }

    convertBtn.addEventListener('click', async () => {
        updateStatus('Generating PDF...');
        const blob = await requestPDF();
        if (blob) {
            const a = document.createElement('a');
            a.href = window.URL.createObjectURL(blob);
            a.download = getExportFilename('pdf');
            a.click();
            updateStatus('Download started!');
        }
    });

    previewBtn.addEventListener('click', () => {
        switchPreviewMode('pdf');
        updatePreview();
    });

    function triggerAutoUpdate() {
        // Web Preview is triggered immediately on every keystroke
        updateWebPreview();
        saveToLocal();

        // PDF Auto-update only if enabled and in PDF mode
        if (!autoUpdateToggle.checked) return;
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (currentPreviewMode === 'pdf') {
                updatePreview();
            }
        }, parseInt(updateDelaySelect.value));
    }

    editor.on('change', () => { triggerAutoUpdate(); });
    const settingInputs = [pageFormat, showHeader, headerTitle, showPageNumbers, pageFormatStyle, showCopyright, copyrightText, autoPageBreak, breakH1, breakH2, breakH3];
    settingInputs.forEach(input => {
        input.addEventListener((input.type === 'text' ? 'input' : 'change'), () => { triggerAutoUpdate(); });
    });

    function updateStatus(text, isError = false) {
        statusMsg.textContent = text;
        statusMsg.classList.toggle('error', isError);
        statusMsg.style.transform = 'scale(1.05)';
        setTimeout(() => { statusMsg.style.transform = 'scale(1)'; }, 200);
    }

    const zoomButtons = document.querySelectorAll('.zoom-btn');
    zoomButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const size = btn.dataset.size;
            zoomButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = currentPreviewMode === 'web' ? webPreview : pdfPreview;
            if (size === 'fit') {
                target.style.width = '100%';
                target.style.transform = 'scale(1)';
            } else {
                const scale = parseInt(size) / 100;
                target.style.width = (100 / scale) + '%';
                target.style.transform = `scale(${scale})`;
            }
        });
    });
    
    // Initial Mode
    switchPreviewMode('web');
});
