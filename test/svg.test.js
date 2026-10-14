/**
 * figma_create_svg: the server-side half (validation, currentColor substitution,
 * response report). The plugin half needs Figma and is checked by hand.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SVG_LENGTH,
  DEFAULT_CURRENT_COLOR,
  validateSvgInput,
  substituteCurrentColor,
  withCurrentColorReport
} from '../src/tools/svg.js';
import { handleCreateSvg } from '../src/tools/mutations.js';

// lucide-react's "x" icon, as shipped in an .svg file
const LUCIDE_X =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

describe('validateSvgInput', () => {
  test('accepts complete markup with no options', () => {
    assert.equal(validateSvgInput({ svg: LUCIDE_X }), null);
  });

  test('accepts every option at a valid value', () => {
    assert.equal(validateSvgInput({
      svg: LUCIDE_X, width: 16, height: 16, fillColor: '#fff', strokeColor: '#1F2937'
    }), null);
  });

  test('requires svg to be a non-empty string', () => {
    for (const svg of [undefined, null, 42, '', '   \n ']) {
      assert.equal(validateSvgInput({ svg }).code, 'INVALID_PARAMS', `svg: ${JSON.stringify(svg)}`);
    }
  });

  test('caps the markup length', () => {
    const atLimit = '<svg>' + ' '.repeat(MAX_SVG_LENGTH - '<svg></svg>'.length) + '</svg>';
    assert.equal(atLimit.length, MAX_SVG_LENGTH);
    assert.equal(validateSvgInput({ svg: atLimit }), null);

    const problem = validateSvgInput({ svg: atLimit + ' ' });
    assert.equal(problem.code, 'INVALID_PARAMS');
    assert.match(problem.message, /limit/);
  });

  test('rejects input with no <svg> element as INVALID_SVG', () => {
    for (const svg of ['M18 6 6 18', 'data:image/svg+xml;base64,PHN2Zz4=', '/icons/x.svg', '<svgfoo/>']) {
      assert.equal(validateSvgInput({ svg }).code, 'INVALID_SVG', `svg: ${svg}`);
    }
  });

  test('finds the <svg> element after a prolog or comment', () => {
    const svg = '<?xml version="1.0"?>\n<!-- icon -->\n<svg\n  viewBox="0 0 24 24"></svg>';
    assert.equal(validateSvgInput({ svg }), null);
  });

  test('accepts only #RGB and #RRGGBB colors', () => {
    for (const field of ['fillColor', 'strokeColor']) {
      for (const value of ['red', '#12345', '#GGGGGG', '#11223344', '111827', 'currentColor', '']) {
        const problem = validateSvgInput({ svg: LUCIDE_X, [field]: value });
        assert.equal(problem && problem.code, 'INVALID_PARAMS', `${field}: ${value}`);
        assert.match(problem.message, new RegExp(field));
      }
    }
  });

  test('requires width and height to be positive numbers', () => {
    for (const field of ['width', 'height']) {
      for (const value of [0, -24, NaN, Infinity, '24']) {
        const problem = validateSvgInput({ svg: LUCIDE_X, [field]: value });
        assert.equal(problem && problem.code, 'INVALID_PARAMS', `${field}: ${value}`);
      }
    }
  });
});

describe('substituteCurrentColor', () => {
  test('replaces a Lucide icon\'s stroke and leaves fill="none" alone', () => {
    const result = substituteCurrentColor(LUCIDE_X, { strokeColor: '#1F2937' });
    assert.equal(result.replaced, 1);
    assert.match(result.svg, /stroke="#1F2937"/);
    assert.match(result.svg, /fill="none"/);
    assert.match(result.svg, /stroke-width="2"/);
    assert.doesNotMatch(result.svg, /currentColor/i);
  });

  test('routes fill uses to fillColor and stroke uses to strokeColor', () => {
    const svg = '<svg><path fill="currentColor"/><path stroke="currentColor"/></svg>';
    const result = substituteCurrentColor(svg, { fillColor: '#ff0000', strokeColor: '#0000ff' });
    assert.equal(result.svg, '<svg><path fill="#ff0000"/><path stroke="#0000ff"/></svg>');
    assert.equal(result.replaced, 2);
    assert.equal(result.fill, '#ff0000');
    assert.equal(result.stroke, '#0000ff');
  });

  test('a single color covers both fill and stroke', () => {
    const svg = '<svg><path fill="currentColor" stroke="currentColor"/></svg>';
    const expected = '<svg><path fill="#123456" stroke="#123456"/></svg>';
    assert.equal(substituteCurrentColor(svg, { strokeColor: '#123456' }).svg, expected);
    assert.equal(substituteCurrentColor(svg, { fillColor: '#123456' }).svg, expected);
  });

  test('defaults to black, as a browser does', () => {
    const result = substituteCurrentColor('<svg fill="currentColor"><path stroke="currentColor"/></svg>');
    assert.equal(DEFAULT_CURRENT_COLOR, '#000000');
    assert.equal(result.svg, '<svg fill="#000000"><path stroke="#000000"/></svg>');
    assert.equal(result.fill, DEFAULT_CURRENT_COLOR);
    assert.equal(result.stroke, DEFAULT_CURRENT_COLOR);
  });

  test('handles single quotes, spacing and any keyword case', () => {
    const svg = "<svg><path fill = 'CurrentColor' /><path stroke=\" currentcolor \"/></svg>";
    const result = substituteCurrentColor(svg, { fillColor: '#111111', strokeColor: '#222222' });
    assert.equal(result.svg, "<svg><path fill = '#111111' /><path stroke=\"#222222\"/></svg>");
    assert.equal(result.replaced, 2);
  });

  test('replaces CSS declarations in style attributes and <style> blocks', () => {
    const svg =
      '<svg><style>.a { stroke: currentColor !important; } .b{fill:currentColor}</style>' +
      '<path style="fill: currentColor; stroke:currentColor"/></svg>';
    const result = substituteCurrentColor(svg, { fillColor: '#111111', strokeColor: '#222222' });
    assert.equal(
      result.svg,
      '<svg><style>.a { stroke: #222222 !important; } .b{fill:#111111}</style>' +
      '<path style="fill: #111111; stroke:#222222"/></svg>'
    );
    assert.equal(result.replaced, 4);
  });

  test('replaces the color where it is declared, so nested <g> children inherit it', () => {
    const svg =
      '<svg fill="none" stroke="currentColor"><g fill="currentColor" stroke="none"><circle r="1"/></g>' +
      '<g style="fill:none;stroke:currentColor"><path d="M0 0"/></g></svg>';
    const result = substituteCurrentColor(svg, { fillColor: '#111111', strokeColor: '#222222' });
    assert.equal(
      result.svg,
      '<svg fill="none" stroke="#222222"><g fill="#111111" stroke="none"><circle r="1"/></g>' +
      '<g style="fill:none;stroke:#222222"><path d="M0 0"/></g></svg>'
    );
    assert.equal(result.replaced, 3);
  });

  test('other uses of currentColor take the fill color', () => {
    const svg = '<svg><linearGradient><stop stop-color="currentColor"/></linearGradient></svg>';
    const result = substituteCurrentColor(svg, { fillColor: '#111111', strokeColor: '#222222' });
    assert.equal(result.svg, '<svg><linearGradient><stop stop-color="#111111"/></linearGradient></svg>');
    assert.equal(result.replaced, 1);
  });

  test('leaves markup without currentColor untouched', () => {
    const svg = '<svg data-fill="x"><path fill="#ff0000" fill-rule="evenodd" stroke="none"/></svg>';
    const result = substituteCurrentColor(svg, { fillColor: '#111111' });
    assert.equal(result.svg, svg);
    assert.equal(result.replaced, 0);
  });
});

describe('withCurrentColorReport', () => {
  const pluginResult = { success: true, nodeId: '1:2' };

  test('reports what was replaced', () => {
    const substitution = substituteCurrentColor(LUCIDE_X, { strokeColor: '#1F2937' });
    assert.deepEqual(withCurrentColorReport(pluginResult, substitution, { strokeColor: '#1F2937' }), {
      success: true,
      nodeId: '1:2',
      currentColor: { replaced: 1, fill: '#1F2937', stroke: '#1F2937' }
    });
  });

  test('warns when colors were given but nothing used currentColor', () => {
    const substitution = substituteCurrentColor('<svg><path fill="#f00"/></svg>', { fillColor: '#111111' });
    const withWarnings = Object.assign({}, pluginResult, { warnings: ['from the plugin'] });
    const report = withCurrentColorReport(withWarnings, substitution, { fillColor: '#111111' });
    assert.equal(report.warnings.length, 2);
    assert.equal(report.warnings[0], 'from the plugin');
    assert.match(report.warnings[1], /no effect/);
    assert.equal(report.currentColor, undefined);
    assert.deepEqual(withWarnings.warnings, ['from the plugin'], 'the plugin result is not mutated');
  });

  test('returns the result unchanged when there is nothing to report', () => {
    const substitution = substituteCurrentColor('<svg><path fill="#f00"/></svg>');
    assert.equal(withCurrentColorReport(pluginResult, substitution, {}), pluginResult);
  });
});

describe('handleCreateSvg', () => {
  // Records the commands it is sent and answers like the plugin would.
  function fakeBridge({ connected = true } = {}) {
    const sent = [];
    return {
      sent,
      isConnected: () => connected,
      sendCommand: async (command, payload) => {
        sent.push({ command, payload });
        return { success: true, nodeId: '1:2', node: { id: '1:2', type: 'FRAME' } };
      }
    };
  }

  function parse(response) {
    return JSON.parse(response.content[0].text);
  }

  test('sends the substituted markup and reports the substitution', async () => {
    const bridge = fakeBridge();
    const response = await handleCreateSvg(bridge, {
      svg: LUCIDE_X, x: 10, y: 20, width: 16, name: 'icon/x', flatten: true, strokeColor: '#1F2937'
    });

    assert.equal(response.isError, undefined);
    assert.equal(bridge.sent.length, 1);
    assert.equal(bridge.sent[0].command, 'create_svg');

    const payload = bridge.sent[0].payload;
    assert.match(payload.svg, /stroke="#1F2937"/);
    assert.doesNotMatch(payload.svg, /currentColor/i);
    assert.equal(payload.x, 10);
    assert.equal(payload.y, 20);
    assert.equal(payload.width, 16);
    assert.equal(payload.name, 'icon/x');
    assert.equal(payload.flatten, true);
    assert.ok(!('fillColor' in payload) && !('strokeColor' in payload), 'colors stay on the server');

    const body = parse(response);
    assert.equal(body.nodeId, '1:2');
    assert.deepEqual(body.currentColor, { replaced: 1, fill: '#1F2937', stroke: '#1F2937' });
  });

  test('rejects invalid input without calling the plugin', async () => {
    const bridge = fakeBridge();

    const notSvg = await handleCreateSvg(bridge, { svg: 'M18 6 6 18' });
    assert.equal(notSvg.isError, true);
    assert.equal(parse(notSvg).error.code, 'INVALID_SVG');

    const badColor = await handleCreateSvg(bridge, { svg: LUCIDE_X, strokeColor: 'slate' });
    assert.equal(badColor.isError, true);
    assert.equal(parse(badColor).error.code, 'INVALID_PARAMS');

    assert.equal(bridge.sent.length, 0);
  });

  test('reports NOT_CONNECTED when the plugin is not connected', async () => {
    const bridge = fakeBridge({ connected: false });
    const response = await handleCreateSvg(bridge, { svg: LUCIDE_X });
    assert.equal(response.isError, true);
    assert.equal(parse(response).error.code, 'NOT_CONNECTED');
    assert.equal(bridge.sent.length, 0);
  });

  test('passes plugin errors through', async () => {
    const bridge = {
      isConnected: () => true,
      sendCommand: async () => {
        const error = new Error('Figma could not import the SVG: unexpected end of input.');
        error.code = 'INVALID_SVG';
        throw error;
      }
    };
    const response = await handleCreateSvg(bridge, { svg: '<svg><path d="M0 0' });
    assert.equal(response.isError, true);
    assert.deepEqual(parse(response).error, {
      code: 'INVALID_SVG',
      message: 'Figma could not import the SVG: unexpected end of input.'
    });
  });
});
