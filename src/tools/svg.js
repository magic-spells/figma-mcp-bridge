/**
 * SVG import preparation for figma_create_svg.
 *
 * Everything that can be decided without Figma happens here, server side, so it
 * is testable with plain Node: input validation and the currentColor
 * substitution. The plugin only parses the prepared markup with
 * figma.createNodeFromSvg() and sizes and places the result.
 */

// An icon is a few hundred characters and a detailed illustration a few hundred
// thousand. Past this the markup is not something to paste through a tool call,
// and the parse risks the bridge's 30-second command timeout.
export const MAX_SVG_LENGTH = 500000;

// What currentColor resolves to in a browser when nothing sets `color`.
export const DEFAULT_CURRENT_COLOR = '#000000';

// #RGB or #RRGGBB. The value is written straight into the markup, so only plain
// hex is accepted: nothing that could break out of an attribute, and no alpha
// (set the node's opacity instead).
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// An <svg> start tag somewhere in the markup. Figma's parser is the real judge;
// this only catches input that is plainly not SVG markup (a bare path "d"
// string, a data: URI, a file path).
const SVG_ELEMENT_PATTERN = /<svg[\s>/]/i;

// currentColor in its three forms. CSS keywords are case-insensitive, so all
// three match "currentcolor" as well. The lookbehinds keep "fill" from matching
// inside a longer name such as "data-fill".
//   fill="currentColor"          presentation attribute
const ATTRIBUTE_PATTERN = /(?<![\w:-])(fill|stroke)(\s*=\s*)(["'])\s*currentcolor\s*\3/gi;
//   fill: currentColor           declaration in a style="" attribute or <style> block
const DECLARATION_PATTERN = /(?<![\w-])(fill|stroke)(\s*:\s*)currentcolor(?![\w-])/gi;
//   stop-color="currentColor"    any other use
const KEYWORD_PATTERN = /(?<![\w-])currentcolor(?![\w-])/gi;

const UNUSED_COLOR_WARNING =
  'fillColor / strokeColor had no effect: the SVG does not use currentColor, so it keeps its own colors. ' +
  'To recolor it, import with flatten: true and set the single vector\'s color with figma_set_fills / ' +
  'figma_set_strokes.';

/**
 * Check figma_create_svg input. The MCP schema enforces the same rules; this is
 * the handler's own guard, and it returns the more specific INVALID_SVG code
 * when the markup itself is the problem.
 * @param {Object} args - the tool arguments
 * @returns {{code: string, message: string}|null} the first problem found, or null when valid
 */
export function validateSvgInput(args) {
  const { svg } = args;

  if (typeof svg !== 'string' || svg.trim() === '') {
    return { code: 'INVALID_PARAMS', message: 'svg is required: pass the SVG markup as a string' };
  }

  if (svg.length > MAX_SVG_LENGTH) {
    return {
      code: 'INVALID_PARAMS',
      message: `svg is ${svg.length} characters, over the ${MAX_SVG_LENGTH}-character limit. ` +
        'Simplify the artwork or run it through an optimizer such as SVGO first.'
    };
  }

  if (!SVG_ELEMENT_PATTERN.test(svg)) {
    return {
      code: 'INVALID_SVG',
      message: 'svg has no <svg> element. Pass the complete markup of an .svg file, from <svg ...> to </svg> — ' +
        'a bare path "d" string, a data: URI or a file path is not SVG markup.'
    };
  }

  for (const field of ['fillColor', 'strokeColor']) {
    const value = args[field];
    if (value !== undefined && !(typeof value === 'string' && HEX_COLOR_PATTERN.test(value))) {
      return {
        code: 'INVALID_PARAMS',
        message: `${field} must be a hex color, #RGB or #RRGGBB (got ${JSON.stringify(value)})`
      };
    }
  }

  for (const field of ['width', 'height']) {
    const value = args[field];
    if (value !== undefined && !(typeof value === 'number' && Number.isFinite(value) && value > 0)) {
      return {
        code: 'INVALID_PARAMS',
        message: `${field} must be a positive number of pixels (got ${JSON.stringify(value)})`
      };
    }
  }

  return null;
}

/**
 * Replace currentColor, which Figma's SVG import cannot resolve, with real colors.
 *
 * A fill use takes fillColor, a stroke use takes strokeColor, and each falls
 * back to the other and then to black, so a single color recolors a whole
 * one-color icon. Any other use (stop-color, flood-color, ...) takes the fill
 * color.
 *
 * @param {string} svg - SVG markup
 * @param {{fillColor?: string, strokeColor?: string}} colors - hex colors from the caller
 * @returns {{svg: string, replaced: number, fill: string, stroke: string}}
 *   the rewritten markup, how many uses were replaced, and the two colors used
 */
export function substituteCurrentColor(svg, { fillColor, strokeColor } = {}) {
  const fill = fillColor || strokeColor || DEFAULT_CURRENT_COLOR;
  const stroke = strokeColor || fillColor || DEFAULT_CURRENT_COLOR;
  const colorFor = (property) => (property.toLowerCase() === 'stroke' ? stroke : fill);
  let replaced = 0;

  const output = svg
    .replace(ATTRIBUTE_PATTERN, (match, property, equals, quote) => {
      replaced++;
      return `${property}${equals}${quote}${colorFor(property)}${quote}`;
    })
    .replace(DECLARATION_PATTERN, (match, property, colon) => {
      replaced++;
      return `${property}${colon}${colorFor(property)}`;
    })
    .replace(KEYWORD_PATTERN, () => {
      replaced++;
      return fill;
    });

  return { svg: output, replaced, fill, stroke };
}

/**
 * Add the currentColor outcome to the plugin's result. Only the server saw the
 * original markup, so only the server can report it.
 *
 * Replacements are reported as `currentColor`. Colors that were given but had
 * nothing to replace become a warning rather than a silent no-op.
 *
 * @param {Object} result - the plugin's create_svg result
 * @param {{replaced: number, fill: string, stroke: string}} substitution - from substituteCurrentColor
 * @param {{fillColor?: string, strokeColor?: string}} colors - the colors the caller passed
 * @returns {Object} the result with the report added
 */
export function withCurrentColorReport(result, substitution, { fillColor, strokeColor } = {}) {
  if (substitution.replaced > 0) {
    return Object.assign({}, result, {
      currentColor: {
        replaced: substitution.replaced,
        fill: substitution.fill,
        stroke: substitution.stroke
      }
    });
  }

  if (fillColor || strokeColor) {
    return Object.assign({}, result, {
      warnings: (result.warnings || []).concat(UNUSED_COLOR_WARNING)
    });
  }

  return result;
}
