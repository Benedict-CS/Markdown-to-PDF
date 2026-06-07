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
        docSelector: get('doc-selector')
    };

    // 3. Editor Init
    editor = CodeMirror.fromTextArea(get('markdown-input'), {
        mode: 'markdown', lineNumbers: true, theme: 'default', lineWrapping: true
    });
    editor.on('change', () => {
        console.log("Editor content changed");
        triggerAutoUpdate();
    });

    // 4. Functions

    async function updateWebPreview() {
        const md = editor.getValue();
        if (!md) { elements.webPreview.innerHTML = '<div style="color:#aaa; text-align:center; margin-top:2rem;">Start typing...</div>'; return; }
        try {
            const html = (typeof marked.parse === 'function') ? marked.parse(md) : marked(md);
            elements.webPreview.innerHTML = html;
        } catch (e) { elements.webPreview.innerHTML = md; }

        // Local Image Fix
        elements.webPreview.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src');
            if (src && src.startsWith('./images/')) {
                img.src = src.substring(1); // transform ./images/ to /images/
            }
        });
    }

    async function requestPDF() {
        const md = editor.getValue().trim();
        if (!md) return null;

        const config = {
            pagination: { 
                enable_auto_page_break: get('auto-page-break').checked, 
                break_before_h1: get('break-h1').checked,
                break_before_h2: get('break-h2').checked,
                break_before_h3: get('break-h3').checked,
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
            console.log("Requesting PDF from server...");
            elements.loadingSpinner.style.display = 'block';
            const res = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdownContent: md, configOptions: config })
            });
            if (!res.ok) throw new Error("Server responded with error");
            return await res.blob();
        } catch (e) { 
            console.error("PDF Request failed:", e);
            return null; 
        } finally { 
            elements.loadingSpinner.style.display = 'none'; 
        }
    }

    async function updatePreview() {
        if (isUpdating) {
            console.log("Already updating, queuing next request");
            needsUpdate = true; 
            return; 
        }
        
        updateWebPreview();
        if (currentPreviewMode !== 'pdf') return;

        isUpdating = true;
        needsUpdate = false;
        
        try {
            const blob = await requestPDF();
            if (blob) {
                console.log("Received new PDF blob, refreshing iframe");
                if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
                currentPdfBlobUrl = URL.createObjectURL(blob);
                
                // FORCE REFRESH: Replace iframe completely to avoid caching
                const newIframe = elements.pdfPreview.cloneNode();
                newIframe.src = currentPdfBlobUrl;
                newIframe.style.display = 'block';
                elements.pdfPreview.parentNode.replaceChild(newIframe, elements.pdfPreview);
                elements.pdfPreview = newIframe;
                
                if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
            }
        } catch (err) {
            console.error("Update Preview Error:", err);
        } finally {
            isUpdating = false;
            console.log("Update finished. needsUpdate:", needsUpdate);
            if (needsUpdate) updatePreview();
        }
    }

    function triggerAutoUpdate() {
        updateWebPreview();
        saveToLocal();
        if (!elements.autoUpdate.checked) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log("Debounce timeout reached, updating PDF");
            updatePreview();
        }, 500);
    }

    function saveToLocal() {
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        if (docs[currentDocId]) {
            docs[currentDocId].markdown = editor.getValue();
            docs[currentDocId].lastSaved = new Date().toISOString();
            localStorage.setItem('md_docs', JSON.stringify(docs));
        }
        // Save settings too
        const settings = {
            showHeader: get('show-header').checked,
            headerLeftText: get('header-left-text').value,
            headerRightText: get('header-right-text').value,
            showFooter: get('show-footer').checked,
            autoUpdate: elements.autoUpdate.checked
        };
        localStorage.setItem('md_pdf_settings_simple', JSON.stringify(settings));
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
            if (currentPdfBlobUrl) {
                elements.pdfPreview.style.display = 'block';
                if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'none';
            } else {
                elements.pdfPreview.style.display = 'none';
                if (elements.previewPlaceholder) elements.previewPlaceholder.style.display = 'block';
                updatePreview();
            }
        }
    }

    // 5. Explicit Event Binding
    get('mode-web-btn').onclick = () => switchMode('web');
    get('mode-pdf-btn').onclick = () => switchMode('pdf');
    get('preview-btn').onclick = () => {
        console.log("Manual update clicked");
        updatePreview();
    };

    // Binding ALL settings manually to be safe
    const allInputs = document.querySelectorAll('.settings-content input, .settings-content select, #auto-update');
    allInputs.forEach(el => {
        const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(ev, () => {
            console.log(`Setting changed: ${el.id}`);
            triggerAutoUpdate();
        });
    });

    // 6. Initial Load
    const savedDocs = JSON.parse(localStorage.getItem('md_docs') || '{}');
    if (Object.keys(savedDocs).length > 0) {
        currentDocId = Object.keys(savedDocs)[0];
        editor.setValue(savedDocs[currentDocId].markdown || '');
    } else {
        fetch('/api/example').then(r => r.text()).then(t => { editor.setValue(t); });
    }
    
    // Zoom Logic
    document.querySelectorAll('.zoom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const size = btn.dataset.size;
            [elements.webPreview, elements.pdfPreview].forEach(target => {
                if (size === 'fit') { target.style.width = '100%'; target.style.margin = '0'; }
                else { target.style.width = size + '%'; target.style.margin = '2rem auto'; }
            });
        });
    });

    updatePreview();
});
