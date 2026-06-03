/**
 * Elegant Markdown to PDF Configuration
 * 
 * This is the main configuration file. Since it is a JavaScript file, 
 * you can add comments to describe your settings.
 */

module.exports = {
  pagination: {
    // Master switch to enable/disable automatic page breaks
    enable_auto_page_break: true,

    // Choose which heading levels trigger a new page.
    break_before_h1: false,
    break_before_h2: false,
    break_before_h3: false,

    // Standard paper size (e.g., 'A4', 'Letter', 'Legal')
    format: "A4",

    // Page margins (can use mm, cm, or in)
    margin: {
      top: "10mm",
      right: "15mm",
      bottom: "12mm",
      left: "15mm"
    }
  },

  header_footer: {
    // -- Header Settings (Top of each page) --
    // If true, shows title and author at the top left/right
    show_header: true,
    header_title: "How to use markdown",
    header_author: "Benedict Tiong",

    // -- Footer Settings (Bottom of each page) --
    // If true, shows the copyright text at the bottom left
    show_copyright: true,
    copyright_text: "© 2026 All Rights Reserved",

    // If true, shows page numbers at the bottom right
    show_page_numbers: true,

    // Page number style: 
    // 'page_of' (Page 1 of 5) | 'slash' (1 / 5) | 'simple' (1)
    page_number_format: "simple"
  },

  appearance: {
    // Main theme color for headers and accents
    accent_color: "#0366d6",

    // Color for the border line under H1 headers
    h1_border_color: "#333333",

    // Base text color for the entire document
    text_color: "#333333",

    // Base font size (px, pt, rem, etc.)
    base_font_size: "14px",

    // Spacing between lines of text
    line_height: "1.5"
  },

  features: {
    // If true, the tool will load 'custom.css' from the root folder if it exists
    use_custom_css: true
  }
};
