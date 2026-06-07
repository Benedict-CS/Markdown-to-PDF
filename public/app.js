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

    // Controls - Basic
    const pageFormat = document.getElementById('page-format');
    const autoPageBreak = document.getElementById('auto-page-break');
    const breakH1 = document.getElementById('break-h1');
    const breakH2 = document.getElementById('break-h2');
    const breakH3 = document.getElementById('break-h3');

    // Controls - Header
    const showHeader = document.getElementById('show-header');
    const headerLeftEnable = document.getElementById('header-left-enable');
    const headerLeftText = document.getElementById('header-left-text');
    const headerRightEnable = document.getElementById('header-right-enable');
    const headerRightText = document.getElementById('header-right-text');

    // Controls - Footer
    const showFooter = document.getElementById('show-footer');
    const footerLeftEnable = document.getElementById('footer-left-enable');
    const footerLeftText = document.getElementById('footer-left-text');
    const footerRightEnable = document.getElementById('footer-right-enable');
    const pageFormatStyle = document.getElementById('page-format-style');
    
    // Controls - Global
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
    let currentPdfBlobUrl = null;
    let isUpdating = false;
    let needsUpdate = false;

    /**
     * Preview Mode Switching
     */
    function resetPdfPreview() {
        if (currentPdfBlobUrl) {
            URL.revokeObjectURL(currentPdfBlobUrl);
            currentPdfBlobUrl = null;
        }
        pdfPreview.src = 'about:blank';
        pdfPreview.style.display = 'none';
        if (currentPreviewMode === 'pdf') {
            previewPlaceholder.style.display = 'block';
        }
        needsUpdate = false;
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
            if (currentPdfBlobUrl) {
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
     * Instant Web Preview
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
            let src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                if (src.startsWith('./')) src = src.substring(2);
                img.src = '/' + src;
            }
        });

        // Math rendering if available
        if (window.renderMathInElement) {
            renderMathInElement(webPreview, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false}
                ]
            });
        }

        // Mermaid rendering if available
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
     * Persistence & Settings
     */
    function saveToLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (!docs[currentDocId]) {
            docs[currentDocId] = { id: currentDocId, name: 'Untitled Draft' };
        }
        docs[currentDocId].markdown = editor.getValue();
        docs[currentDocId].lastSaved = new Date().toISOString();
        localStorage.setItem('md_docs', JSON.stringify(docs));

        const settings = {
            pageFormat: pageFormat.value,
            showHeader: showHeader.checked,
            headerLeftEnable: headerLeftEnable.checked,
            headerLeftText: headerLeftText.value,
            headerRightEnable: headerRightEnable.checked,
            headerRightText: headerRightText.value,
            showFooter: showFooter.checked,
            footerLeftEnable: footerLeftEnable.checked,
            footerLeftText: footerLeftText.value,
            footerRightEnable: footerRightEnable.checked,
            pageFormatStyle: pageFormatStyle.value,
            autoPageBreak: autoPageBreak.checked, 
            breakH1: breakH1.checked, 
            breakH2: breakH2.checked, 
            breakH3: breakH3.checked
        };
        localStorage.setItem('md_pdf_settings', JSON.stringify(settings));
        
        statusMsg.classList.add('saved');
        statusMsg.textContent = 'Saved';
        setTimeout(() => {
            statusMsg.classList.remove('saved');
            statusMsg.textContent = 'Ready';
        }, 1000);
    }

    function loadFromLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const doc = docs[currentDocId];
        if (doc) editor.setValue(doc.markdown || '');

        const saved = localStorage.getItem('md_pdf_settings');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (pageFormat) pageFormat.value = d.pageFormat || 'A4';
                if (showHeader) showHeader.checked = d.showHeader ?? true;
                if (headerLeftEnable) headerLeftEnable.checked = d.headerLeftEnable ?? true;
                if (headerLeftText) headerLeftText.value = d.headerLeftText || 'Document Title';
                if (headerRightEnable) headerRightEnable.checked = d.headerRightEnable ?? false;
                if (headerRightText) headerRightText.value = d.headerRightText || '';
                
                if (showFooter) showFooter.checked = d.showFooter ?? true;
                if (footerLeftEnable) footerLeftEnable.checked = d.footerLeftEnable ?? true;
                if (footerLeftText) footerLeftText.value = d.footerLeftText || '© 2026 All Rights Reserved';
                if (footerRightEnable) footerRightEnable.checked = d.footerRightEnable ?? true;
                if (pageFormatStyle) pageFormatStyle.value = d.pageFormatStyle || 'page_of';

                if (autoPageBreak) autoPageBreak.checked = d.autoPageBreak ?? true;
                if (breakH1) breakH1.checked = d.breakH1 ?? false;
                if (breakH2) breakH2.checked = d.breakH2 ?? false;
                if (breakH3) breakH3.checked = d.breakH3 ?? false;
            } catch(e) { console.error('Settings load error', e); }
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

    /**
     * Document Actions
     */
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
        }
    });

    deleteDocBtn.addEventListener('click', () => {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (Object.keys(docs).length <= 1) return alert('Cannot delete last doc.');
        if (confirm('Delete current document?')) {
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
        const docName = name || 'Untitled';
        const id = 'doc_' + Date.now();
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        docs[id] = { id, name: docName, markdown: `# ${docName}\n\nStart writing here...`, lastSaved: new Date().toISOString() };
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
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const content = editor.getValue();
        const b = new Blob([content], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = (docs[currentDocId]?.name || 'document').toLowerCase().replace(/\s+/g, '-') + '.md';
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

    loadExampleBtn.addEventListener('click', () => { if (confirm('Restore example content?')) loadExample(); });
    clearEditorBtn.addEventListener('click', () => { 
        if (confirm('Clear editor?')) { 
            editor.setValue(''); 
            resetPdfPreview();
            updatePreview(); 
        } 
    });

    /**
     * PDF Generation
     */
    async function requestPDF() {
        const markdown = editor.getValue().trim();
        if (!markdown) return null;
        
        const config = {
            pagination: { 
                enable_auto_page_break: autoPageBreak.checked, 
                break_before_h1: breakH1.checked, 
                break_before_h2: breakH2.checked, 
                break_before_h3: breakH3.checked, 
                format: pageFormat.value 
            },
            header_footer: { 
                show_header: showHeader.checked, 
                header_left: headerLeftEnable.checked ? headerLeftText.value : '',
                header_right: headerRightEnable.checked ? headerRightText.value : '',
                show_footer: showFooter.checked,
                footer_left: footerLeftEnable.checked ? footerLeftText.value : '',
                footer_right: footerRightEnable.checked ? 'PAGE_NUM' : '',
                page_number_format: pageFormatStyle.value
            }
        };

        try {
            loadingSpinner.style.display = 'block';
            const res = await fetch('/api/convert', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ markdownContent: markdown, configOptions: config }) 
            });
            return res.ok ? await res.blob() : null;
        } catch (e) { 
            console.error('PDF Request Error', e);
            return null; 
        } finally { 
            loadingSpinner.style.display = 'none'; 
        }
    }

    async function updatePreview() {
        if (isUpdating) {
            needsUpdate = true;
            return;
        }

        clearTimeout(debounceTimer);
        updateWebPreview();
        
        if (currentPreviewMode === 'pdf') {
            isUpdating = true;
            needsUpdate = false;
            
            const blob = await requestPDF();
            if (blob) { 
                if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
                currentPdfBlobUrl = URL.createObjectURL(blob);
                pdfPreview.src = currentPdfBlobUrl; 
                pdfPreview.style.display = 'block'; 
                previewPlaceholder.style.display = 'none'; 
            }
            
            isUpdating = false;
            if (needsUpdate) updatePreview();
        }
    }

    convertBtn.addEventListener('click', async () => {
        const blob = await requestPDF();
        if (blob) { 
            const a = document.createElement('a'); 
            a.href = URL.createObjectURL(blob); 
            a.download = 'document.pdf'; 
            a.click(); 
        }
    });

    previewBtn.addEventListener('click', () => { 
        if (currentPreviewMode !== 'pdf') switchPreviewMode('pdf'); 
        else updatePreview();
    });

    /**
     * Auto-Update Orchestration
     */
    function triggerAutoUpdate() {
        updateWebPreview();
        saveToLocal();
        if (!autoUpdateToggle.checked) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { 
            if (currentPreviewMode === 'pdf') updatePreview(); 
        }, 500);
    }

    editor.on('change', triggerAutoUpdate);
    
    // Bind all inputs/selects
    const inputElements = [
        pageFormat, autoPageBreak, breakH1, breakH2, breakH3,
        showHeader, headerLeftEnable, headerLeftText, headerRightEnable, headerRightText,
        showFooter, footerLeftEnable, footerLeftText, footerRightEnable, pageFormatStyle,
        autoUpdateToggle
    ];

    inputElements.forEach(el => {
        if (!el) return;
        // Listen to 'input' for text boxes (immediate) and 'change' for checkboxes/selects
        const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(eventType, () => {
            triggerAutoUpdate();
        });
    });

    // Initial Load
    if (Object.keys(JSON.parse(localStorage.getItem('md_docs') || '{}')).length === 0) {
        loadExample();
    } else {
        loadFromLocal();
        updatePreview();
    }

    // Zoom Controls
    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const size = btn.dataset.size;
            
            [webPreview, pdfPreview].forEach(target => {
                target.style.transform = 'scale(1)';
                if (size === 'fit') {
                    target.style.width = '100%';
                    target.style.margin = '0';
                    if (target === webPreview) target.style.boxShadow = 'none';
                } else {
                    target.style.width = size + '%';
                    target.style.margin = '2rem auto';
                    if (target === webPreview) target.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
                }
            });
        });
    });

    switchPreviewMode('web');
});
