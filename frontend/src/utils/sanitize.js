import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSX attacks and layout breakage from pasted content.
 */
export const sanitizeHTML = (dirty, options = {}) => {
  if (!dirty) return '';

  const defaultOptions = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
      // 'width', 'height', 'style' intentionally excluded —
      // these break responsive layout when pasted from Word/Google Docs/websites
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    ...options,
  };

  // After sanitize, strip any surviving width/height/style attributes
  // (DOMPurify hooks run before the string is returned)
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    node.removeAttribute('width');
    node.removeAttribute('height');
    node.removeAttribute('style');
    // Force images to be responsive
    if (node.tagName === 'IMG') {
      node.style.maxWidth = '100%';
      node.style.height = 'auto';
    }
  });

  let clean = DOMPurify.sanitize(dirty, defaultOptions);

  // Remove hook after use so it doesn't persist globally
  DOMPurify.removeHook('afterSanitizeAttributes');

  // Strip orphaned <br> tags that AI-generated content inserts mid-paragraph.
  // These create the broken mid-word line wrapping visible in blog posts.
  // Pattern: <br> inside a <p> that already has surrounding text — replace with a space.
  // Also remove trailing <br> before </p> and standalone <br><br> paragraph breaks.
  clean = clean
    .replace(/([^>])<br\s*\/?>/gi, '$1 ')
    .replace(/<p[^>]*>\s*(<br\s*\/?> \s*)+/gi, (m) => m.replace(/<br\s*\/?>/gi, ''))
    .replace(/(<br\s*\/?> \s*)+<\/p>/gi, '</p>')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br>')
    .replace(/  +/g, ' ');

  return clean;
};

export const createSafeMarkup = (html) => ({ __html: sanitizeHTML(html) });

export default sanitizeHTML;
