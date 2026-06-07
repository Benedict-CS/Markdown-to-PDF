document.addEventListener('DOMContentLoaded', () => {
    const convertBtn = document.getElementById('convert-btn');
    const markdownInput = document.getElementById('markdown-input');
    const statusMsg = document.getElementById('status-message');

    // Controls
    const accentColor = document.getElementById('accent-color');
    const fontSize = document.getElementById('font-size');
    const pageFormat = document.getElementById('page-format');
    const showPageNumbers = document.getElementById('show-page-numbers');
    const showCopyright = document.getElementById('show-copyright');
    const copyrightText = document.getElementById('copyright-text');
    const autoPageBreak = document.getElementById('auto-page-break');

    /**
     * Trigger the conversion API and handle the file download.
     */
    convertBtn.addEventListener('click', async () => {
        const markdown = markdownInput.value.trim();
        if (!markdown) {
            updateStatus('Please enter some markdown content first.', true);
            return;
        }

        updateStatus('Generating PDF...');
        convertBtn.disabled = true;

        const config = {
            pagination: {
                enable_auto_page_break: autoPageBreak.checked,
                auto_page_break_level: 2,
                format: pageFormat.value
            },
            header_footer: {
                show_copyright: showCopyright.checked,
                copyright_text: copyrightText.value,
                show_page_numbers: showPageNumbers.checked
            },
            appearance: {
                accent_color: accentColor.value,
                base_font_size: fontSize.value
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

            if (!response.ok) throw new Error('Conversion failed on server.');

            // Receive the blob and download it
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            updateStatus('Conversion successful! PDF downloaded.');
        } catch (error) {
            console.error('API Error:', error);
            updateStatus('Error: Could not generate PDF.', true);
        } finally {
            convertBtn.disabled = false;
        }
    });

    function updateStatus(text, isError = false) {
        statusMsg.textContent = text;
        statusMsg.classList.toggle('error', isError);
    }
});
