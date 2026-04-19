import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} dirty - Untrusted HTML string
 * @param {object} options - DOMPurify configuration options
 * @returns {string} - Sanitized HTML safe for rendering
 */
export const sanitizeHTML = (dirty, options = {}) => {
  if (!dirty) return '';
  
  const defaultOptions = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
      'width', 'height', 'style'
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    ...options
  };
  
  return DOMPurify.sanitize(dirty, defaultOptions);
};

/**
 * Create safe dangerouslySetInnerHTML prop
 * @param {string} html - HTML string to sanitize
 * @returns {object} - Object with __html property for React
 */
export const createSafeMarkup = (html) => {
  return { __html: sanitizeHTML(html) };
};

export default sanitizeHTML;
