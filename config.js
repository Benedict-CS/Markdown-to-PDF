/**
 * Elegant Markdown to PDF Configuration
 * 
 * You can customize the PDF output by modifying this file.
 * Since this is a JavaScript file, you can use comments to explain your settings!
 */

module.exports = {
  pagination: {
    // Master switch for automatic page breaks (true/false)
    enable_auto_page_break: true,

    // Which heading level triggers a new page?
    // 1: H1 only, 2: H1 & H2, 3: H1, H2 & H3
    auto_page_break_level: 2,

    // Page format: 'A4', 'Letter', etc.
    format: 'A4',

    // Page margins in mm or cm
    margin: {
      top: '12mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm'
    }
  },

  header_footer: {
    // Bottom-left text (e.g., Copyright or Project Name)
    copyright_text: "© 2026 All Rights Reserved",

    // Show copyright text?
    show_copyright: true,

    // Show page numbers at the bottom right?
    show_page_numbers: true,

    // Format of page numbers:
    // 'page_of': Page 1 of 5
    // 'slash': 1 / 5
    // 'simple': 1
    page_number_format: "page_of"
  },

  appearance: {
    // The main color used for sub-headers and accents
    accent_color: "#0366d6",

    // Global text color
    text_color: "#333333",

    // Default font size
    base_font_size: "14px",

    // Space between lines
    line_height: "1.5"
  },

  features: {
    // Use an optional 'custom.css' file if it exists in the root folder
    use_custom_css: true
  }
};
