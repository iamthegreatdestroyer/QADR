/**
 * String utilities.
 *
 * Helpers for string manipulation and formatting.
 */

/**
 * Check if a string is empty or only whitespace.
 *
 * @param str - String to check
 * @returns True if empty or whitespace
 */
export function isBlank(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.trim().length === 0;
}

/**
 * Check if a string is not empty and not only whitespace.
 *
 * @param str - String to check
 * @returns True if not blank
 */
export function isNotBlank(str: string | null | undefined): str is string {
  return !isBlank(str);
}

/**
 * Capitalize first letter of a string.
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Lowercase first letter of a string.
 *
 * @param str - String to process
 * @returns String with lowercase first letter
 */
export function uncapitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Convert string to camelCase.
 *
 * @param str - String to convert
 * @returns camelCase string
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/**
 * Convert string to PascalCase.
 *
 * @param str - String to convert
 * @returns PascalCase string
 */
export function pascalCase(str: string): string {
  return capitalize(camelCase(str));
}

/**
 * Convert string to snake_case.
 *
 * @param str - String to convert
 * @returns snake_case string
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

/**
 * Convert string to kebab-case.
 *
 * @param str - String to convert
 * @returns kebab-case string
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to CONSTANT_CASE.
 *
 * @param str - String to convert
 * @returns CONSTANT_CASE string
 */
export function constantCase(str: string): string {
  return snakeCase(str).toUpperCase();
}

/**
 * Truncate string to a maximum length.
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to append if truncated (default: '...')
 * @returns Truncated string
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Pad string on the left.
 *
 * @param str - String to pad
 * @param length - Target length
 * @param char - Padding character (default: ' ')
 * @returns Padded string
 */
export function padLeft(str: string, length: number, char: string = ' '): string {
  return str.padStart(length, char);
}

/**
 * Pad string on the right.
 *
 * @param str - String to pad
 * @param length - Target length
 * @param char - Padding character (default: ' ')
 * @returns Padded string
 */
export function padRight(str: string, length: number, char: string = ' '): string {
  return str.padEnd(length, char);
}

/**
 * Center string with padding.
 *
 * @param str - String to center
 * @param length - Target length
 * @param char - Padding character (default: ' ')
 * @returns Centered string
 */
export function center(str: string, length: number, char: string = ' '): string {
  if (str.length >= length) return str;

  const leftPad = Math.floor((length - str.length) / 2);
  const rightPad = length - str.length - leftPad;

  return char.repeat(leftPad) + str + char.repeat(rightPad);
}

/**
 * Repeat string n times.
 *
 * @param str - String to repeat
 * @param n - Number of times
 * @returns Repeated string
 */
export function repeat(str: string, n: number): string {
  return str.repeat(Math.max(0, Math.floor(n)));
}

/**
 * Remove leading/trailing whitespace and collapse internal whitespace.
 *
 * @param str - String to normalize
 * @returns Normalized string
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Split string into lines.
 *
 * @param str - String to split
 * @returns Array of lines
 */
export function lines(str: string): string[] {
  return str.split(/\r?\n/);
}

/**
 * Count occurrences of a substring.
 *
 * @param str - String to search in
 * @param substr - Substring to count
 * @returns Number of occurrences
 */
export function count(str: string, substr: string): number {
  if (substr.length === 0) return 0;

  let n = 0;
  let pos = 0;

  while ((pos = str.indexOf(substr, pos)) !== -1) {
    n++;
    pos += substr.length;
  }

  return n;
}

/**
 * Escape HTML special characters.
 *
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Unescape HTML entities.
 *
 * @param str - String to unescape
 * @returns Unescaped string
 */
export function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Escape string for use in regular expression.
 *
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a random string.
 *
 * @param length - Length of string
 * @param chars - Character set (default: alphanumeric)
 * @returns Random string
 */
export function randomString(
  length: number,
  chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Slugify a string for URL-safe usage.
 *
 * @param str - String to slugify
 * @returns Slugified string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Simple string template with placeholder replacement.
 *
 * @param template - Template string with {key} placeholders
 * @param values - Object with replacement values
 * @returns Interpolated string
 */
export function template(
  templateStr: string,
  values: Record<string, string | number>
): string {
  return templateStr.replace(/\{(\w+)\}/g, (_, key: string) => {
    return String(values[key] ?? `{${key}}`);
  });
}

/**
 * Wrap text to a maximum line width.
 *
 * @param text - Text to wrap
 * @param width - Maximum line width
 * @returns Wrapped text
 */
export function wordWrap(text: string, width: number): string {
  if (width <= 0) return text;

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= width) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * Indent each line of text.
 *
 * @param text - Text to indent
 * @param spaces - Number of spaces (or string to use as indent)
 * @returns Indented text
 */
export function indent(text: string, spaces: number | string = 2): string {
  const prefix = typeof spaces === 'number' ? ' '.repeat(spaces) : spaces;
  return text
    .split('\n')
    .map((line) => (line.length > 0 ? prefix + line : line))
    .join('\n');
}

/**
 * Remove common leading whitespace from all lines.
 *
 * @param text - Text to dedent
 * @returns Dedented text
 */
export function dedent(text: string): string {
  const textLines = text.split('\n');

  // Find minimum indent (ignoring empty lines)
  let minIndent = Infinity;
  for (const line of textLines) {
    if (line.trim().length === 0) continue;
    const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    minIndent = Math.min(minIndent, leadingSpaces);
  }

  if (minIndent === 0 || minIndent === Infinity) {
    return text;
  }

  return textLines
    .map((line) => (line.trim().length === 0 ? '' : line.slice(minIndent)))
    .join('\n');
}
