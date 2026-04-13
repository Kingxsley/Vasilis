/**
 * Production-safe logger — only outputs in development mode.
 * Replace console.log/warn/error with logger.log/warn/error.
 */
const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  log: (...args) => isDev && console.log(...args),
  warn: (...args) => isDev && console.warn(...args),
  error: (...args) => console.error(...args), // always log errors
  debug: (...args) => isDev && console.debug(...args),
};

export default logger;
