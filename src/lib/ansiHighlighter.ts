// Pre-compiled regular expressions outside function scope to prevent recompilation on every stream chunk
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/;
const STRAY_ESC_REGEX = /\x1b(?![\[\]])/g;

const ERROR_REGEX = /(ERROR|FATAL):/g;
const WARNING_REGEX = /(WARNING|WARN):/g;
const QUOTED_REGEX = /"([^"]+)"/g;

/**
 * Robust, stateless ANSI highlighter for streaming terminal output chunks.
 */
export const highlightTerminalOutput = (data: string): string => {
  if (!data) return '';

  // 1. Sanitize stray ESC bytes (critical for safety)
  const sanitized = data.replace(STRAY_ESC_REGEX, '');

  // 2. Optimization: If chunk already contains ANSI escape codes, avoid re-highlighting
  if (ANSI_REGEX.test(sanitized)) {
    return sanitized;
  }

  // 3. Stateless tokenization via pre-compiled regex replacements
  return sanitized
    .replace(ERROR_REGEX, '\x1b[1;31m$1:\x1b[0m')   // Bold Red
    .replace(WARNING_REGEX, '\x1b[1;33m$1:\x1b[0m') // Bold Orange/Yellow
    .replace(QUOTED_REGEX, '\x1b[32m"$1"\x1b[0m');   // Green quotes
};
