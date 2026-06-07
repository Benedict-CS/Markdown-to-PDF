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

    /**
     * Common function to call the conversion API
     */
    async function requestPDF() {
        const markdown = editor.getValue().trim();
        if (!markdown) {
            updateStatus('Please enter some markdown content first.', true);
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
     * Preview Action
     */
    previewBtn.addEventListener('click', async () => {
        updateStatus('Updating preview...');
        previewBtn.disabled = true;

        const blob = await requestPDF();
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            pdfPreview.src = url;
            pdfPreview.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            updateStatus('Preview updated!');
        }
        previewBtn.disabled = false;
    });

    function updateStatus(text, isError = false) {
        statusMsg.textContent = text;
        statusMsg.classList.toggle('error', isError);
    }
});
