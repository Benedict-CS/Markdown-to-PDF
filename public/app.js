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
    const accentColor = document.getElementById('accent-color');
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
    
    // Auto-Update Controls
    const autoUpdateToggle = document.getElementById('auto-update');
    const updateDelaySelect = document.getElementById('update-delay');

    let debounceTimer = null;

    /**
     * Update the UI theme color to match the selected accent color
     */
    function updateUITheme(color) {
        document.documentElement.style.setProperty('--accent-color', color);
        
        // Generate a slightly darker version for hover (simplistic approach)
        // For a real app, you might use a library or a helper function
        document.documentElement.style.setProperty('--accent-hover', color + 'ee');
    }

    // Initialize UI theme
    updateUITheme(accentColor.value);

    // Sync UI theme when color changes
    accentColor.addEventListener('input', (e) => {
        updateUITheme(e.target.value);
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
                format: pageFormat.value
            },
            header_footer: {
                show_header: showHeader.checked,
                header_title: headerTitle.value,
                show_copyright: showCopyright.checked,
                copyright_text: copyrightText.value,
                show_page_numbers: showPageNumbers.checked,
                page_number_format: pageFormatStyle.value
            },
            appearance: {
                accent_color: accentColor.value
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
    editor.on('change', triggerAutoUpdate);

    // Trigger update on any setting change
    const settingInputs = [
        accentColor, pageFormat, showHeader, headerTitle, 
        showPageNumbers, pageFormatStyle, showCopyright, 
        copyrightText, autoPageBreak, breakH1, breakH2
    ];

    settingInputs.forEach(input => {
        // 'input' event for real-time (colors, text), 'change' for selects/checkboxes
        const eventType = (input.type === 'color' || input.type === 'text') ? 'input' : 'change';
        input.addEventListener(eventType, triggerAutoUpdate);
    });

    function updateStatus(text, isError = false) {
        statusMsg.textContent = text;
        statusMsg.classList.toggle('error', isError);
    }
});
