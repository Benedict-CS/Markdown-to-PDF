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
        lineWrapping: true,
        // Pad the line number so the gutter width is reserved up-front. Otherwise
        // CodeMirror grows the gutter when the doc crosses 9→10 or 99→100 lines,
        // which visibly shifts the editor content.   is a non-breaking space
        // (a regular space at the start of a gutter cell gets collapsed).
        lineNumberFormatter: n => String(n).padStart(3, ' ')
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
        if (Object.keys(docs).length <= 1) return toast('Keep at least one document.', 'warning');
        confirmDialog({
            title: 'Delete document?',
            message: `"${docs[currentDocId]?.name || 'Document'}" will be permanently removed.`,
            danger: true,
            confirmText: 'Delete'
        }).then(ok => {
            if (!ok) return;
            delete docs[currentDocId];
            localStorage.setItem('md_docs', JSON.stringify(docs));
            currentDocId = Object.keys(docs)[0];
            editor.setValue(docs[currentDocId].markdown || '');
            updateDocSelector();
            resetPdfPreview();
            updatePreview();
            toast('Document deleted', 'success');
        });
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
                    toast('Upload failed: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (err) {
                console.error('Image upload failed:', err);
                toast('Server error during image upload', 'error');
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
        confirmDialog({
            title: 'Restore sample document?',
            message: 'Your current draft will be replaced with the bundled example.',
            confirmText: 'Restore'
        }).then(ok => {
            if (!ok) return;
            fetch('/api/example').then(r => r.text()).then(t => {
                editor.setValue(t); resetPdfPreview(); updatePreview();
                toast('Sample restored', 'success');
            });
        });
    };
    elements.clearEditorBtn.onclick = () => {
        confirmDialog({
            title: 'Clear editor?',
            message: 'All current content will be removed. This cannot be undone.',
            danger: true,
            confirmText: 'Clear'
        }).then(ok => {
            if (!ok) return;
            editor.setValue(''); resetPdfPreview(); updatePreview();
            toast('Editor cleared', 'success');
        });
    };

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

    // 7. Mobile tabbar — switch which panel is visible at <=900px
    document.querySelectorAll('.mobile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            document.querySelectorAll('.mobile-tab').forEach(t => {
                const on = t === tab;
                t.classList.toggle('active', on);
                t.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            document.querySelectorAll('[data-panel]').forEach(p => {
                p.classList.toggle('is-active', p.dataset.panel === target);
            });
            if (target === 'editor' && editor) {
                setTimeout(() => editor.refresh(), 50);
            }
        });
    });

    // ============================================================
    // 8. Toast notifications
    // ============================================================
    const toastContainer = get('toast-container');
    const TOAST_ICONS = { success: '✅', error: '⛔', warning: '⚠️', info: 'ℹ️' };

    function toast(msg, type) {
        if (!toastContainer) return;
        type = type || 'info';
        const el = document.createElement('div');
        el.className = 'toast toast-' + type;
        el.innerHTML = '<span class="toast-icon">' + (TOAST_ICONS[type] || TOAST_ICONS.info) +
            '</span><span class="toast-msg"></span>';
        el.querySelector('.toast-msg').textContent = msg;
        toastContainer.appendChild(el);
        setTimeout(() => {
            el.classList.add('toast-leaving');
            el.addEventListener('animationend', () => el.remove(), { once: true });
        }, type === 'error' ? 4500 : 2800);
    }

    // ============================================================
    // 9. Confirm modal — Promise<boolean>
    // ============================================================
    function confirmDialog(opts) {
        opts = opts || {};
        const title = opts.title || 'Are you sure?';
        const message = opts.message || '';
        const confirmText = opts.confirmText || 'Confirm';
        const cancelText = opts.cancelText || 'Cancel';
        const danger = !!opts.danger;
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.innerHTML =
                '<div class="modal-card" role="dialog" aria-modal="true">' +
                '<h3></h3><p></p>' +
                '<div class="modal-actions">' +
                '<button type="button" class="btn-secondary" data-act="cancel"></button>' +
                '<button type="button" data-act="ok"></button>' +
                '</div></div>';
            backdrop.querySelector('h3').textContent = title;
            backdrop.querySelector('p').textContent = message;
            const cancelBtn = backdrop.querySelector('[data-act="cancel"]');
            const okBtn = backdrop.querySelector('[data-act="ok"]');
            cancelBtn.textContent = cancelText;
            okBtn.textContent = confirmText;
            okBtn.className = danger ? 'btn-danger' : 'btn-primary';
            const close = (val) => {
                document.removeEventListener('keydown', onKey);
                backdrop.remove();
                resolve(val);
            };
            const onKey = (e) => {
                if (e.key === 'Escape') close(false);
                if (e.key === 'Enter') close(true);
            };
            backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); });
            cancelBtn.onclick = () => close(false);
            okBtn.onclick = () => close(true);
            document.addEventListener('keydown', onKey);
            get('modal-root').appendChild(backdrop);
            setTimeout(() => okBtn.focus(), 50);
        });
    }

    // ============================================================
    // 10. Editor status footer — word/char/line + save indicator
    // ============================================================
    const statWords = get('stat-words');
    const statChars = get('stat-chars');
    const statLines = get('stat-lines');
    const saveIndicator = get('save-indicator');
    let saveTimer = null;

    function updateStats() {
        const v = editor.getValue();
        if (statChars) statChars.textContent = v.length;
        if (statLines) statLines.textContent = v ? v.split('\n').length : 0;
        if (statWords) statWords.textContent = v.trim() ? v.trim().split(/\s+/).length : 0;
    }
    function markDirty() {
        if (!saveIndicator) return;
        saveIndicator.className = 'save-indicator dirty';
        saveIndicator.textContent = 'Unsaved';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveIndicator.className = 'save-indicator saved';
            saveIndicator.textContent = 'Saved';
        }, 600);
    }
    editor.on('change', () => { updateStats(); markDirty(); });
    updateStats();
    if (saveIndicator) { saveIndicator.className = 'save-indicator saved'; saveIndicator.textContent = 'Saved'; }

    // ============================================================
    // 12. Drag & drop file load
    // ============================================================
    let dragDepth = 0;
    function isFileDrag(e) {
        return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    }
    document.addEventListener('dragenter', e => {
        if (!isFileDrag(e)) return;
        dragDepth++;
        document.body.classList.add('is-dragging-file');
    });
    document.addEventListener('dragover', e => { if (isFileDrag(e)) e.preventDefault(); });
    document.addEventListener('dragleave', () => {
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) document.body.classList.remove('is-dragging-file');
    });
    document.addEventListener('drop', async e => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        dragDepth = 0;
        document.body.classList.remove('is-dragging-file');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            // route through existing image upload
            const dt = new DataTransfer();
            dt.items.add(file);
            elements.imageUpload.files = dt.files;
            elements.imageUpload.dispatchEvent(new Event('change'));
        } else if (/\.(md|markdown|txt)$/i.test(file.name) || file.type.startsWith('text/')) {
            const r = new FileReader();
            r.onload = ev => {
                editor.setValue(ev.target.result);
                resetPdfPreview();
                updatePreview();
                toast('Loaded ' + file.name, 'success');
            };
            r.readAsText(file);
        } else {
            toast('Unsupported file type: ' + (file.type || file.name), 'warning');
        }
    });

    // ============================================================
    // 13. Resizable splitters (desktop only)
    // ============================================================
    const SPLIT_KEY = 'md_split_widths';
    const splitState = (() => {
        try { return JSON.parse(localStorage.getItem(SPLIT_KEY)) || {}; } catch (e) { return {}; }
    })();
    function applySplit() {
        const ed = document.querySelector('.editor-panel');
        const pv = document.querySelector('.preview-panel');
        const sb = document.querySelector('.controls-panel');
        if (splitState['editor-preview'] && ed && pv) {
            ed.style.flex = '0 0 ' + splitState['editor-preview'].editor + 'px';
            pv.style.flex = '1';
        }
        if (splitState['preview-settings'] && sb) {
            sb.style.width = splitState['preview-settings'].settings + 'px';
        }
    }
    applySplit();

    document.querySelectorAll('.splitter').forEach(splitter => {
        splitter.addEventListener('mousedown', e => {
            if (window.innerWidth <= 900) return;
            e.preventDefault();
            const which = splitter.dataset.split;
            const container = splitter.parentElement;
            const containerRect = container.getBoundingClientRect();
            const editorEl = document.querySelector('.editor-panel');
            const previewEl = document.querySelector('.preview-panel');
            const settingsEl = document.querySelector('.controls-panel');
            splitter.classList.add('dragging');
            document.body.classList.add('is-resizing');

            const onMove = (ev) => {
                if (which === 'editor-preview') {
                    let w = ev.clientX - editorEl.getBoundingClientRect().left;
                    w = Math.max(240, Math.min(w, containerRect.width - 320 - settingsEl.offsetWidth));
                    editorEl.style.flex = '0 0 ' + w + 'px';
                    previewEl.style.flex = '1';
                    splitState['editor-preview'] = { editor: w };
                } else if (which === 'preview-settings') {
                    let w = containerRect.right - ev.clientX;
                    w = Math.max(240, Math.min(w, 560));
                    settingsEl.style.width = w + 'px';
                    splitState['preview-settings'] = { settings: w };
                }
            };
            const onUp = () => {
                splitter.classList.remove('dragging');
                document.body.classList.remove('is-resizing');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                try { localStorage.setItem(SPLIT_KEY, JSON.stringify(splitState)); } catch (err) {}
                if (editor) editor.refresh();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // double-click to reset
        splitter.addEventListener('dblclick', () => {
            const which = splitter.dataset.split;
            delete splitState[which];
            const ed = document.querySelector('.editor-panel');
            const pv = document.querySelector('.preview-panel');
            const sb = document.querySelector('.controls-panel');
            if (which === 'editor-preview' && ed && pv) { ed.style.flex = ''; pv.style.flex = ''; }
            if (which === 'preview-settings' && sb) { sb.style.width = ''; }
            try { localStorage.setItem(SPLIT_KEY, JSON.stringify(splitState)); } catch (err) {}
            if (editor) editor.refresh();
        });
    });

    // ============================================================
    // 14. Keyboard shortcuts
    // ============================================================
    document.addEventListener('keydown', e => {
        const mod = e.ctrlKey || e.metaKey;
        if (!mod) return;
        // Ctrl/Cmd+S → export markdown
        if (e.key === 's' && !e.shiftKey) {
            e.preventDefault();
            elements.downloadMDBtn.click();
            toast('Markdown exported', 'success');
        }
        // Ctrl/Cmd+Shift+P → download PDF
        if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
            e.preventDefault();
            elements.convertBtn.click();
        }
        // Ctrl/Cmd+/ → toggle live preview
        if (e.key === '/') {
            e.preventDefault();
            elements.autoUpdate.checked = !elements.autoUpdate.checked;
            elements.autoUpdate.dispatchEvent(new Event('change'));
            toast('Live preview ' + (elements.autoUpdate.checked ? 'on' : 'off'), 'info');
        }
    });
});
