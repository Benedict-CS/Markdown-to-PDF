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
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    const loadingSpinner = document.getElementById('loading-spinner');

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
    const newDocBtn = document.getElementById('new-doc-btn');

    let debounceTimer = null;
    let currentDocId = 'current';

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
        
        if (!docs[currentDocId]) {
            docs[currentDocId] = { id: currentDocId, name: currentDocId === 'current' ? 'Primary Draft' : 'Untitled Draft' };
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
        const oldName = docs[currentDocId].name || 'Untitled Draft';
        const newName = prompt('Rename document:', oldName);
        if (newName && newName !== oldName) {
            docs[currentDocId].name = newName;
            localStorage.setItem('md_docs', JSON.stringify(docs));
            updateDocSelector();
            updateStatus(`Renamed to "${newName}"`);
        }
    });

    newDocBtn.addEventListener('click', () => {
        const docName = prompt('Enter a name for your new document:', `Draft ${new Date().toLocaleTimeString()}`);
        if (docName === null) return;

        const newId = 'doc_' + Date.now();
        const docs = JSON.parse(localStorage.getItem('md_docs') || '{}');
        docs[newId] = { 
            id: newId, 
            name: docName || 'Untitled Draft',
            markdown: '', 
            lastSaved: new Date().toISOString() 
        };
        localStorage.setItem('md_docs', JSON.stringify(docs));
        currentDocId = newId;
        loadFromLocal();
        updatePreview();
        updateStatus(`New draft "${docName || 'Untitled'}" created.`);
    });

    /**
     * File Actions
     */
    function handleFile(file) {
        if (!file || !file.name.endsWith('.md')) {
            updateStatus('Please upload a .md file.', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            editor.setValue(e.target.result);
            updatePreview();
            updateStatus(`File loaded: ${file.name}`);
        };
        reader.readAsText(file);
    }

    uploadBtn.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', (e) => handleFile(e.target.files[0]));

    downloadMDBtn.addEventListener('click', () => {
        const blob = new Blob([editor.getValue()], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.md';
        a.click();
        updateStatus('Markdown exported!');
    });

    // Drag and Drop
    editorPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        editorPanel.classList.add('drag-over');
    });
    editorPanel.addEventListener('dragleave', () => editorPanel.classList.remove('drag-over'));
    editorPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        editorPanel.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    /**
     * Load example.md content into the editor
     */
    async function loadExample() {
        try {
            const response = await fetch('/api/example');
            if (response.ok) {
                const text = await response.text();
                editor.setValue(text);
                updatePreview();
            }
        } catch (error) {
            console.error('Failed to load example:', error);
            updateStatus('Failed to load example.', true);
        }
    }

    // Startup
    const existingDocs = JSON.parse(localStorage.getItem('md_docs') || '{}');
    if (Object.keys(existingDocs).length === 0) {
        loadExample();
    } else {
        loadFromLocal();
        updatePreview();
    }

    loadExampleBtn.addEventListener('click', () => {
        if (confirm('Restore example content?')) loadExample();
    });

    clearEditorBtn.addEventListener('click', () => {
        if (confirm('Clear everything?')) {
            editor.setValue('');
            updatePreview();
            updateStatus('Editor cleared.');
        }
    });

    /**
     * Common function to call the conversion API
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
                header_title: headerTitle.value,
                show_copyright: showCopyright.checked,
                copyright_text: copyrightText.value,
                show_page_numbers: showPageNumbers.checked,
                page_number_format: pageFormatStyle.value
            }
        };

        try {
            loadingSpinner.style.display = 'block';
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdownContent: markdown, configOptions: config })
            });

            if (!response.ok) throw new Error('Conversion failed.');
            return await response.blob();
        } catch (error) {
            console.error('API Error:', error);
            updateStatus('Error generating PDF.', true);
            return null;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    async function updatePreview() {
        updateStatus('Updating preview...');
        const blob = await requestPDF();
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            pdfPreview.src = url;
            pdfPreview.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            updateStatus('Preview updated!');
        }
    }

    convertBtn.addEventListener('click', async () => {
        updateStatus('Generating PDF...');
        convertBtn.disabled = true;
        const blob = await requestPDF();
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document.pdf';
            a.click();
            updateStatus('Download started!');
        }
        convertBtn.disabled = false;
    });

    previewBtn.addEventListener('click', updatePreview);

    function triggerAutoUpdate() {
        if (!autoUpdateToggle.checked) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updatePreview(), parseInt(updateDelaySelect.value));
    }

    editor.on('change', () => { triggerAutoUpdate(); saveToLocal(); });

    const settingInputs = [
        pageFormat, showHeader, headerTitle, 
        showPageNumbers, pageFormatStyle, showCopyright, 
        copyrightText, autoPageBreak, breakH1, breakH2, breakH3
    ];

    settingInputs.forEach(input => {
        const eventType = (input.type === 'text') ? 'input' : 'change';
        input.addEventListener(eventType, () => { triggerAutoUpdate(); saveToLocal(); });
    });

    function updateStatus(text, isError = false) {
        statusMsg.textContent = text;
        statusMsg.classList.toggle('error', isError);
        statusMsg.style.transform = 'scale(1.05)';
        setTimeout(() => { statusMsg.style.transform = 'scale(1)'; }, 200);
    }
});
