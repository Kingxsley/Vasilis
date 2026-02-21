/**
 * RTL Text Direction Utilities
 * Detects if text contains RTL characters (Arabic, Hebrew, Persian, etc.)
 */

// RTL character ranges
const RTL_REGEX = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;

/**
 * Check if text contains RTL characters
 */
export const isRTL = (text) => {
  if (!text || typeof text !== 'string') return false;
  return RTL_REGEX.test(text);
};

/**
 * Get the direction for a given text
 */
export const getTextDirection = (text) => {
  return isRTL(text) ? 'rtl' : 'ltr';
};

/**
 * Get style object for text direction
 */
export const getDirectionStyle = (text) => {
  const dir = getTextDirection(text);
  return {
    direction: dir,
    textAlign: dir === 'rtl' ? 'right' : 'left',
  };
};

/**
 * RTL-aware component wrapper props
 */
export const getRTLProps = (text) => {
  const dir = getTextDirection(text);
  return {
    dir,
    style: {
      direction: dir,
      textAlign: dir === 'rtl' ? 'right' : 'left',
    }
  };
};

export default { isRTL, getTextDirection, getDirectionStyle, getRTLProps };
