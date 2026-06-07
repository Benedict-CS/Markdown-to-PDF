document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Element References ---
    const elements = {
        editorInput: document.getElementById('markdown-input'),
        previewBtn: document.getElementById('preview-btn'),
        convertBtn: document.getElementById('convert-btn'),
        statusMsg: document.getElementById('status-message'),
        pdfPreview: document.getElementById('pdf-preview'),
        webPreview: document.getElementById('web-preview'),
        previewPlaceholder: document.querySelector('.preview-placeholder'),
        loadingSpinner: document.getElementById('loading-spinner'),
        modeWebBtn: document.getElementById('mode-web-btn'),
        modePdfBtn: document.getElementById('mode-pdf-btn'),
        pageFormat: document.getElementById('page-format'),
        autoPageBreak: document.getElementById('auto-page-break'),
        breakH1: document.getElementById('break-h1'),
        breakH2: document.getElementById('break-h2'),
        breakH3: document.getElementById('break-h3'),
        showHeader: document.getElementById('show-header'),
        headerLeftEnable: document.getElementById('header-left-enable'),
        headerLeftText: document.getElementById('header-left-text'),
        headerRightEnable: document.getElementById('header-right-enable'),
        headerRightText: document.getElementById('header-right-text'),
        showFooter: document.getElementById('show-footer'),
        footerLeftEnable: document.getElementById('footer-left-enable'),
        footerLeftText: document.getElementById('footer-left-text'),
        footerRightEnable: document.getElementById('footer-right-enable'),
        pageFormatStyle: document.getElementById('page-format-style'),
        autoUpdateToggle: document.getElementById('auto-update'),
        loadExampleBtn: document.getElementById('load-example-btn'),
        clearEditorBtn: document.getElementById('clear-editor-btn'),
        uploadBtn: document.getElementById('upload-btn'),
        downloadMDBtn: document.getElementById('download-md-btn'),
        fileUpload: document.getElementById('file-upload'),
        editorPanel: document.querySelector('.editor-panel'),
        docSelector: document.getElementById('doc-selector'),
        renameDocBtn: document.getElementById('rename-doc-btn'),
        deleteDocBtn: document.getElementById('delete-doc-btn'),
        newDocBtn: document.getElementById('new-doc-btn')
    };

    // --- 2. State ---
    let editor = null;
    let currentPreviewMode = 'web';
    let currentDocId = 'current';
    let currentPdfBlobUrl = null;
    let isUpdating = false;
    let needsUpdate = false;
    let debounceTimer = null;

    // --- 3. Initialization ---
    function initEditor() {
        if (!elements.editorInput) return;
        editor = CodeMirror.fromTextArea(elements.editorInput, {
            mode: 'markdown',
            lineNumbers: true,
            theme: 'default',
            lineWrapping: true,
            extraKeys: {
                "Ctrl-S": (cm) => elements.convertBtn.click(),
                "Ctrl-P": (cm) => updatePreview()
            }
        });
        editor.on('change', triggerAutoUpdate);
    }

    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
    }

    // --- 4. Logic Functions ---
    async function updateWebPreview() {
        if (!editor || !elements.webPreview) return;
        const markdown = editor.getValue();
        
        if (!markdown) {
            elements.webPreview.innerHTML = '<div style="color:#aaa; text-align:center; margin-top:2rem;">Start typing to preview...</div>';
            return;
        }

        try {
            // Robust marked parsing
            if (typeof marked !== 'undefined') {
                const options = { breaks: true, gfm: true };
                // marked v4+ uses marked.parse, older might use marked()
                const html = marked.parse ? marked.parse(markdown, options) : marked(markdown, options);
                elements.webPreview.innerHTML = html;
            }
        } catch (e) { console.error('Marked parsing error', e); }

        // Local Image Fix
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
            const mermaidBlocks = elements.webPreview.querySelectorAll('pre code.language-mermaid');
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
    }

    async function requestPDF() {
        if (!editor) return null;
        const markdown = editor.getValue().trim();
        if (!markdown) return null;

        const config = {
            pagination: { 
                enable_auto_page_break: elements.autoPageBreak?.checked, 
                break_before_h1: elements.breakH1?.checked, 
                break_before_h2: elements.breakH2?.checked, 
                break_before_h3: elements.breakH3?.checked, 
                format: elements.pageFormat?.value 
            },
            header_footer: { 
                show_header: elements.showHeader?.checked, 
                header_left: elements.headerLeftEnable?.checked ? elements.headerLeftText?.value : '',
                header_right: elements.headerRightEnable?.checked ? elements.headerRightText?.value : '',
                show_footer: elements.showFooter?.checked,
                footer_left: elements.footerLeftEnable?.checked ? elements.footerLeftText?.value : '',
                footer_right: elements.footerRightEnable?.checked ? 'PAGE_NUM' : '',
                page_number_format: elements.pageFormatStyle?.value
            }
        };

        try {
            if (elements.loadingSpinner) elements.loadingSpinner.style.display = 'block';
            const res = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdownContent: markdown, configOptions: config })
            });
            return res.ok ? await res.blob() : null;
        } catch (e) {
            console.error('PDF generation request failed', e);
            return null;
        } finally {
            if (elements.loadingSpinner) elements.loadingSpinner.style.display = 'none';
        }
    }

    async function updatePreview() {
        if (isUpdating) {
            needsUpdate = true;
            return;
        }

        clearTimeout(debounceTimer);
        await updateWebPreview();

        if (currentPreviewMode === 'pdf') {
            isUpdating = true;
            needsUpdate = false;
            try {
                const blob = await requestPDF();
                if (blob) {
                    if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
                    currentPdfBlobUrl = URL.createObjectURL(blob);
                    if (elements.pdfPreview) {
                        elements.pdfPreview.src = currentPdfBlobUrl;
                        elements.pdfPreview.style.display = 'block';
                    }
                    if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
                }
            } catch (e) { console.error('Preview update error', e); }
            finally {
                isUpdating = false;
                if (needsUpdate) updatePreview();
            }
        }
    }

    function triggerAutoUpdate() {
        updateWebPreview();
        saveToLocal();
        if (elements.autoUpdateToggle && !elements.autoUpdateToggle.checked) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (currentPreviewMode === 'pdf') updatePreview();
        }, 500);
    }

    function resetPdfPreview() {
        if (currentPdfBlobUrl) {
            URL.revokeObjectURL(currentPdfBlobUrl);
            currentPdfBlobUrl = null;
        }
        if (elements.pdfPreview) {
            elements.pdfPreview.src = 'about:blank';
            elements.pdfPreview.style.display = 'none';
        }
        if (currentPreviewMode === 'pdf' && elements.previewPlaceholder) {
            elements.previewPlaceholder.style.display = 'block';
        }
        needsUpdate = false;
    }

    function switchPreviewMode(mode) {
        currentPreviewMode = mode;
        if (elements.modeWebBtn) elements.modeWebBtn.classList.toggle('active', mode === 'web');
        if (elements.modePdfBtn) elements.modePdfBtn.classList.toggle('active', mode === 'pdf');

        if (mode === 'web') {
            if (elements.webPreview) elements.webPreview.style.display = 'block';
            if (elements.pdfPreview) elements.pdfPreview.style.display = 'none';
            if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
            updateWebPreview();
        } else {
            if (elements.webPreview) elements.webPreview.style.display = 'none';
            if (currentPdfBlobUrl) {
                if (elements.pdfPreview) elements.pdfPreview.style.display = 'block';
                if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
            } else {
                if (elements.pdfPreview) elements.pdfPreview.style.display = 'none';
                if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'block';
                updatePreview();
            }
        }
    }

    // --- 5. Persistence ---
    function saveToLocal() {
        if (!editor) return;
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (!docs[currentDocId]) docs[currentDocId] = { id: currentDocId, name: 'Untitled Draft' };
        
        docs[currentDocId].markdown = editor.getValue();
        docs[currentDocId].lastSaved = new Date().toISOString();
        localStorage.setItem('md_docs', JSON.stringify(docs));

        const settings = {
            pageFormat: elements.pageFormat?.value,
            showHeader: elements.showHeader?.checked,
            headerLeftEnable: elements.headerLeftEnable?.checked,
            headerLeftText: elements.headerLeftText?.value,
            headerRightEnable: elements.headerRightEnable?.checked,
            headerRightText: elements.headerRightText?.value,
            showFooter: elements.showFooter?.checked,
            footerLeftEnable: elements.footerLeftEnable?.checked,
            footerLeftText: elements.footerLeftText?.value,
            footerRightEnable: elements.footerRightEnable?.checked,
            pageFormatStyle: elements.pageFormatStyle?.value,
            autoPageBreak: elements.autoPageBreak?.checked,
            breakH1: elements.breakH1?.checked,
            breakH2: elements.breakH2?.checked,
            breakH3: elements.breakH3?.checked
        };
        localStorage.setItem('md_pdf_settings', JSON.stringify(settings));

        if (elements.statusMsg) {
            elements.statusMsg.classList.add('saved');
            elements.statusMsg.textContent = 'Saved';
            setTimeout(() => {
                elements.statusMsg.classList.remove('saved');
                elements.statusMsg.textContent = 'Ready';
            }, 1000);
        }
    }

    function loadFromLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        const doc = docs[currentDocId];
        if (doc && editor) editor.setValue(doc.markdown || '');

        const saved = localStorage.getItem('md_pdf_settings');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (elements.pageFormat) elements.pageFormat.value = d.pageFormat || 'A4';
                if (elements.showHeader) elements.showHeader.checked = d.showHeader ?? true;
                if (elements.headerLeftEnable) elements.headerLeftEnable.checked = d.headerLeftEnable ?? true;
                if (elements.headerLeftText) elements.headerLeftText.value = d.headerLeftText || 'Document Title';
                if (elements.headerRightEnable) elements.headerRightEnable.checked = d.headerRightEnable ?? false;
                if (elements.headerRightText) elements.headerRightText.value = d.headerRightText || '';
                if (elements.showFooter) elements.showFooter.checked = d.showFooter ?? true;
                if (elements.footerLeftEnable) elements.footerLeftEnable.checked = d.footerLeftEnable ?? true;
                if (elements.footerLeftText) elements.footerLeftText.value = d.footerLeftText || '© 2026 All Rights Reserved';
                if (elements.footerRightEnable) elements.footerRightEnable.checked = d.footerRightEnable ?? true;
                if (elements.pageFormatStyle) elements.pageFormatStyle.value = d.pageFormatStyle || 'page_of';
                if (elements.autoPageBreak) elements.autoPageBreak.checked = d.autoPageBreak ?? true;
                if (elements.breakH1) elements.breakH1.checked = d.breakH1 ?? false;
                if (elements.breakH2) elements.breakH2.checked = d.breakH2 ?? false;
                if (elements.breakH3) elements.breakH3.checked = d.breakH3 ?? false;
            } catch(e) {}
        }
        updateDocSelector();
        return !!doc;
    }

    function updateDocSelector() {
        if (!elements.docSelector) return;
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

    // --- 6. Event Listeners ---
    initEditor();

    if (elements.modeWebBtn) elements.modeWebBtn.addEventListener('click', () => switchPreviewMode('web'));
    if (elements.modePdfBtn) elements.modePdfBtn.addEventListener('click', () => switchPreviewMode('pdf'));

    if (elements.docSelector) {
        elements.docSelector.addEventListener('change', (e) => {
            currentDocId = e.target.value;
            loadFromLocal();
            resetPdfPreview();
            updatePreview();
        });
    }

    if (elements.renameDocBtn) {
        elements.renameDocBtn.addEventListener('click', () => {
            const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
            const newName = prompt('Rename document:', docs[currentDocId]?.name || '');
            if (newName) {
                docs[currentDocId].name = newName;
                localStorage.setItem('md_docs', JSON.stringify(docs));
                updateDocSelector();
            }
        });
    }

    if (elements.deleteDocBtn) {
        elements.deleteDocBtn.addEventListener('click', () => {
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
    }

    if (elements.newDocBtn) {
        elements.newDocBtn.addEventListener('click', () => {
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
    }

    if (elements.uploadBtn) elements.uploadBtn.addEventListener('click', () => elements.fileUpload.click());
    if (elements.fileUpload) {
        elements.fileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !file.name.endsWith('.md')) return;
            const r = new FileReader();
            r.onload = (ev) => { 
                if (editor) editor.setValue(ev.target.result); 
                resetPdfPreview();
                updatePreview(); 
            };
            r.readAsText(file);
        });
    }

    if (elements.downloadMDBtn) {
        elements.downloadMDBtn.addEventListener('click', () => {
            const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
            const content = editor.getValue();
            const b = new Blob([content], { type: 'text/markdown' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = (docs[currentDocId]?.name || 'document').toLowerCase().replace(/\s+/g, '-') + '.md';
            a.click();
        });
    }

    if (elements.loadExampleBtn) {
        elements.loadExampleBtn.addEventListener('click', () => {
            if (confirm('Restore example content?')) {
                fetch('/api/example').then(res => res.ok ? res.text() : '').then(text => {
                    if (text && editor) {
                        editor.setValue(text);
                        resetPdfPreview();
                        updatePreview();
                    }
                });
            }
        });
    }

    if (elements.clearEditorBtn) {
        elements.clearEditorBtn.addEventListener('click', () => {
            if (confirm('Clear editor?')) {
                if (editor) editor.setValue('');
                resetPdfPreview();
                updatePreview();
            }
        });
    }

    if (elements.convertBtn) {
        elements.convertBtn.addEventListener('click', async () => {
            const blob = await requestPDF();
            if (blob) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'document.pdf';
                a.click();
            }
        });
    }

    if (elements.previewBtn) {
        elements.previewBtn.addEventListener('click', () => {
            if (currentPreviewMode !== 'pdf') switchPreviewMode('pdf');
            else updatePreview();
        });
    }

    // Settings listeners
    [
        elements.pageFormat, elements.autoPageBreak, elements.breakH1, elements.breakH2, elements.breakH3,
        elements.showHeader, elements.headerLeftEnable, elements.headerLeftText, elements.headerRightEnable, elements.headerRightText,
        elements.showFooter, elements.footerLeftEnable, elements.footerLeftText, elements.footerRightEnable, elements.pageFormatStyle,
        elements.autoUpdateToggle
    ].forEach(el => {
        if (!el) return;
        const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(eventType, triggerAutoUpdate);
    });

    // Zoom Controls
    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const size = btn.dataset.size;
            [elements.webPreview, elements.pdfPreview].forEach(target => {
                if (!target) return;
                target.style.transform = 'scale(1)';
                if (size === 'fit') {
                    target.style.width = '100%';
                    target.style.margin = '0';
                    if (target === elements.webPreview) target.style.boxShadow = 'none';
                } else {
                    target.style.width = size + '%';
                    target.style.margin = '2rem auto';
                    if (target === elements.webPreview) target.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
                }
            });
        });
    });

    // --- 7. Start Up ---
    if (Object.keys(JSON.parse(localStorage.getItem('md_docs') || '{}')).length === 0) {
        fetch('/api/example').then(res => res.ok ? res.text() : '').then(text => {
            if (text && editor) {
                editor.setValue(text);
                updatePreview();
            }
        });
    } else {
        loadFromLocal();
        updatePreview();
    }
    switchPreviewMode('web');
});
