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
    format: "A4",

    // Page margins
    margin: {
      top: "12mm",
      right: "15mm",
      bottom: "15mm",
      left: "15mm"
    }
  },

  header_footer: {
    // -- Header (Top of page) --
    show_header: false, // Set to true to show Title and Author at the top
    header_title: "Document Title",
    header_author: "Author Name",

    // -- Footer (Bottom of page) --
    show_copyright: true,
    copyright_text: "© 2026 All Rights Reserved",

    show_page_numbers: true,
    // Format: 'page_of' (Page 1 of 5), 'slash' (1 / 5), 'simple' (1)
    page_number_format: "page_of"
  },

  appearance: {
    accent_color: "#0366d6",
    text_color: "#333333",
    base_font_size: "14px",
    line_height: "1.5"
  },

  features: {
    use_custom_css: true
  }
};
