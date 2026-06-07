document.addEventListener('DOMContentLoaded', () => {
    // Initialize CodeMirror Editor
    const editor = CodeMirror.fromTextArea(document.getElementById('markdown-input'), {
        mode: 'markdown',
        lineNumbers: true,
        theme: 'default',
        lineWrapping: true,
    });

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
    const fileUpload = document.getElementById('file-upload');
    const editorPanel = document.querySelector('.editor-panel');

    let debounceTimer = null;

    /**
     * Persistence: Save content and settings to localStorage
     */
    function saveToLocal() {
        const data = {
            markdown: editor.getValue(),
            settings: {
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
            }
        };
        localStorage.setItem('md_to_pdf_data', JSON.stringify(data));
    }

    /**
     * Persistence: Load content and settings from localStorage
     */
    function loadFromLocal() {
        const saved = localStorage.getItem('md_to_pdf_data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                editor.setValue(data.markdown || '');
                if (data.settings) {
                    pageFormat.value = data.settings.pageFormat || 'A4';
                    showHeader.checked = data.settings.showHeader ?? false;
                    headerTitle.value = data.settings.headerTitle || '';
                    showPageNumbers.checked = data.settings.showPageNumbers ?? true;
                    pageFormatStyle.value = data.settings.pageFormatStyle || 'page_of';
                    showCopyright.checked = data.settings.showCopyright ?? true;
                    copyrightText.value = data.settings.copyright_text || '';
                    autoPageBreak.checked = data.settings.autoPageBreak ?? true;
                    breakH1.checked = data.settings.breakH1 ?? false;
                    breakH2.checked = data.settings.breakH2 ?? false;
                    breakH3.checked = data.settings.breakH3 ?? false;
                }
                return true;
            } catch (e) {
                console.error('Failed to parse saved data', e);
            }
        }
        return false;
    }

    /**
     * File Upload Logic
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

    // Drag and Drop
    editorPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        editorPanel.classList.add('drag-over');
    });
    editorPanel.addEventListener('dragleave', () => editorPanel.classList.remove('drag-over'));
    editorPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        editorPanel.classList.remove('drag-over');
        handleFile(e.dataTransfer.files[0]);
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

    // Startup: Load from Local or Example
    if (!loadFromLocal()) {
        loadExample();
    } else {
        updatePreview();
    }

    // Re-load example on button click
    loadExampleBtn.addEventListener('click', () => {
        if (confirm('Restore example content? This will overwrite your current text.')) {
            loadExample();
        }
    });

    // Clear editor on button click
    clearEditorBtn.addEventListener('click', () => {
        if (confirm('Clear everything?')) {
            editor.setValue('');
            pdfPreview.style.display = 'none';
            previewPlaceholder.style.display = 'block';
            updateStatus('Editor cleared.');
            localStorage.removeItem('md_to_pdf_data');
        }
    });

    /**
     * Common function to call the conversion API
     */
    async function requestPDF() {
        const markdown = editor.getValue().trim();
        if (!markdown) {
            updateStatus('Please enter markdown content.', true);
            return null;
        }

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
                body: JSON.stringify({
                    markdownContent: markdown,
                    configOptions: config
                })
            });

            if (!response.ok) throw new Error('Conversion failed.');
            return await response.blob();
        } catch (error) {
            console.error('API Error:', error);
            updateStatus('Error: Could not generate PDF.', true);
            return null;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    /**
     * Update the preview iframe
     */
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

    /**
     * Download Action
     */
    convertBtn.addEventListener('click', async () => {
        updateStatus('Generating PDF for download...');
        convertBtn.disabled = true;
        const blob = await requestPDF();
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            updateStatus('Download started!');
        }
        convertBtn.disabled = false;
    });

    /**
     * Manual Preview Button
     */
    previewBtn.addEventListener('click', updatePreview);

    /**
     * Debounced Auto-Update Logic
     */
    function triggerAutoUpdate() {
        if (!autoUpdateToggle.checked) return;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updatePreview();
        }, parseInt(updateDelaySelect.value));
    }

    // Trigger update on editor change
    editor.on('change', () => {
        triggerAutoUpdate();
        saveToLocal();
    });

    // Trigger update on any setting change
    const settingInputs = [
        pageFormat, showHeader, headerTitle, 
        showPageNumbers, pageFormatStyle, showCopyright, 
        copyrightText, autoPageBreak, breakH1, breakH2, breakH3
    ];

    settingInputs.forEach(input => {
        const eventType = (input.type === 'text') ? 'input' : 'change';
        input.addEventListener(eventType, () => {
            triggerAutoUpdate();
            saveToLocal();
        });
    });

    function updateStatus(text, isError = false) {
        statusMsg.textContent = text;
        statusMsg.classList.toggle('error', isError);
        
        // Add a slight pop effect when status changes
        statusMsg.style.transform = 'scale(1.05)';
        setTimeout(() => {
            statusMsg.style.transform = 'scale(1)';
        }, 200);
    }
});
