/**
 * plugin/code.js, run in a node:vm sandbox against a fake `figma` global.
 *
 * The fake models only what the commands under test rely on, written from the
 * plugin API's documented behavior (@figma/plugin-typings). It checks the
 * plugin's own logic: argument handling, ordering, sizing math, cleanup and
 * the response shape. It cannot check Figma itself, so a change to how the
 * plugin calls Figma still needs a reload of the plugin in Figma.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { VERSION } from '../src/version.js';

const PLUGIN_SOURCE = readFileSync(new URL('../plugin/code.js', import.meta.url), 'utf8');
const PACKAGE = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// ------------------------------------------------------------
// Fake scene graph
// ------------------------------------------------------------

let lastId = 0;

class FakeNode {
  constructor(type, { name, x = 0, y = 0, width = 0, height = 0, opacity = 1, fills, strokes, strokeWeight } = {}) {
    this.id = `1:${++lastId}`;
    this.type = type;
    this.name = name || type;
    this.visible = true;
    this.locked = false;
    this.parent = null;
    this.removed = false;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.opacity = opacity;
    if (fills !== undefined) this.fills = fills;
    if (strokes !== undefined) this.strokes = strokes;
    if (strokeWeight !== undefined) this.strokeWeight = strokeWeight;
  }

  remove() {
    if (this.parent) this.parent.detach(this);
    this.removed = true;
  }
}

class FakeContainer extends FakeNode {
  constructor(type, props = {}) {
    super(type, props);
    this.children = [];
    for (const child of props.children || []) this.appendChild(child);
  }

  // Reparents, keeping x/y: appendChild preserves the relative position.
  appendChild(node) {
    if (node.parent) node.parent.detach(node);
    this.children.push(node);
    node.parent = this;
  }

  detach(node) {
    this.children.splice(this.children.indexOf(node), 1);
    node.parent = null;
  }
}

// The Scale tool: the node and everything in it, stroke weights included,
// scaled about the node's top-left corner.
function scaleContents(node, scale) {
  node.x *= scale;
  node.y *= scale;
  node.width *= scale;
  node.height *= scale;
  if ('strokeWeight' in node) node.strokeWeight *= scale;
  for (const child of node.children || []) scaleContents(child, scale);
}

class FakeFrame extends FakeContainer {
  constructor(props) {
    super('FRAME', props);
  }

  rescale(scale) {
    if (!(scale >= 0.01)) throw new Error(`rescale: scale must be >= 0.01 (got ${scale})`);
    this.width *= scale;
    this.height *= scale;
    for (const child of this.children) scaleContents(child, scale);
  }

  // Never moves or resizes the children.
  resizeWithoutConstraints(width, height) {
    this.width = width;
    this.height = height;
  }
}

class FakePage extends FakeContainer {
  constructor(name, { loaded = true } = {}) {
    super('PAGE', { name });
    this.loaded = loaded;
  }

  async loadAsync() {
    this.loaded = true;
  }

  appendChild(node) {
    if (!this.loaded) throw new Error('The page has not been loaded. Call loadAsync() first.');
    super.appendChild(node);
  }
}

class FakeInstance extends FakeContainer {
  constructor() {
    super('INSTANCE', { width: 100, height: 40 });
  }

  appendChild() {
    throw new Error('Cannot move node. New parent is an instance or is inside of an instance');
  }
}

/** A frame as createNodeFromSvg returns it: the SVG's size, its shapes inside. */
function svgFrame({ width = 24, height = 24, shapes = LUCIDE_X_SHAPES } = {}) {
  return new FakeFrame({
    name: 'Frame',
    width,
    height,
    children: shapes.map((shape) => (shape instanceof FakeNode ? shape : new FakeNode('VECTOR', shape)))
  });
}

const INK = { type: 'SOLID', color: { r: 0.12, g: 0.16, b: 0.22 } };

// The two strokes of Lucide's "x", as the import draws them in its 24×24 frame.
const LUCIDE_STROKE = { fills: [], strokes: [INK], strokeWeight: 2 };
const LUCIDE_X_SHAPES = [
  { ...LUCIDE_STROKE, x: 6, y: 6, width: 12, height: 12 },
  { ...LUCIDE_STROKE, x: 6, y: 6, width: 12, height: 12 }
];

/**
 * A fake `figma` global. `importSvg(svg)` stands in for the parser: it returns
 * the frame the import should produce, or throws as Figma does for bad markup.
 */
function fakeFigma({ importSvg = () => svgFrame(), pages = [] } = {}) {
  const currentPage = new FakePage('Page 1');
  const root = new FakeContainer('DOCUMENT', { name: 'Test file', children: [currentPage, ...pages] });
  const posted = [];

  const figma = {
    editorType: 'figma',
    fileKey: 'test-file',
    mixed: Symbol('mixed'),
    root,
    currentPage,
    posted,
    imports: 0,
    flattenCalls: [],
    undoCommits: 0,
    showUI() {},
    ui: {
      onmessage: null,
      postMessage(message) {
        posted.push(message);
      }
    },
    commitUndo() {
      figma.undoCommits++;
    },
    async getNodeByIdAsync(id) {
      const stack = [root];
      while (stack.length > 0) {
        const node = stack.pop();
        if (node.id === id) return node;
        stack.push(...(node.children || []));
      }
      return null;
    },
    // Figma's SVG import: a new frame on the current page.
    createNodeFromSvg(svg) {
      figma.imports++;
      const frame = importSvg(svg);
      currentPage.appendChild(frame);
      return frame;
    },
    // One VECTOR in place of the nodes, in `parent` (the current page when omitted).
    flatten(nodes, parent = currentPage) {
      figma.flattenCalls.push({ nodes: nodes.slice(), parent });
      if (nodes.length === 0) throw new Error('flatten: nodes must be non-empty');
      const left = Math.min(...nodes.map((n) => n.x));
      const top = Math.min(...nodes.map((n) => n.y));
      const vector = new FakeNode('VECTOR', {
        name: 'Vector',
        x: left,
        y: top,
        width: Math.max(...nodes.map((n) => n.x + n.width)) - left,
        height: Math.max(...nodes.map((n) => n.y + n.height)) - top,
        strokeWeight: nodes[0].strokeWeight
      });
      for (const node of nodes) node.remove();
      parent.appendChild(vector);
      return vector;
    }
  };
  return figma;
}

/** Load plugin/code.js against `figma`, as Figma does when the plugin starts. */
function loadPlugin(figma) {
  vm.runInContext(PLUGIN_SOURCE, vm.createContext({ figma, __html__: '', console }), {
    filename: 'plugin/code.js'
  });
}

/** Send one command through the plugin's message handler; resolve to its response payload. */
async function sendCommand(figma, command, payload) {
  await figma.ui.onmessage({ type: 'command', requestId: 'req-1', command, payload });
  const response = figma.posted.at(-1);
  assert.equal(response.type, 'command_response');
  assert.equal(response.requestId, 'req-1');
  return response.payload;
}

function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
}

// ------------------------------------------------------------
// Tests
// ------------------------------------------------------------

describe('handshake', () => {
  test('reports the package version', async () => {
    const figma = fakeFigma();
    loadPlugin(figma);
    await figma.ui.onmessage({ type: 'get_handshake_info' });

    const handshake = figma.posted.at(-1);
    assert.equal(handshake.type, 'handshake_info');
    assert.equal(
      handshake.payload.pluginVersion,
      PACKAGE.version,
      'bump pluginVersion in plugin/code.js with package.json'
    );
    assert.equal(VERSION, PACKAGE.version);
  });
});

describe('create_svg', () => {
  test('imports onto the current page at x/y, named, as one undo step', async () => {
    const figma = fakeFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', x: 100, y: 50, name: 'icon/x' });

    assert.equal(result.success, true);
    assert.equal(result.warnings, undefined);
    assert.equal(result.vectorId, undefined);

    const [frame] = figma.currentPage.children;
    assert.equal(result.nodeId, frame.id);
    assert.equal(result.node.type, 'FRAME');
    assert.equal(result.node.name, 'icon/x');
    assert.deepEqual([result.node.x, result.node.y, result.node.width, result.node.height], [100, 50, 24, 24]);
    assert.equal(result.node.childCount, 2);
    assert.equal(figma.undoCommits, 1);
  });

  test('width alone scales the icon, stroke weights included', async () => {
    const figma = fakeFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', width: 16 });

    assert.equal(result.warnings, undefined);
    assert.deepEqual([result.node.width, result.node.height], [16, 16]);
    const [stroke] = figma.currentPage.children[0].children;
    close(stroke.x, 4, 'stroke x');
    close(stroke.width, 8, 'stroke width');
    close(stroke.strokeWeight, 4 / 3, 'stroke weight');
  });

  test('height alone scales a wide SVG to that height', async () => {
    const figma = fakeFigma({ importSvg: () => svgFrame({ width: 120, height: 40, shapes: [] }) });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', height: 20 });

    assert.deepEqual([result.node.width, result.node.height], [60, 20]);
  });

  test('width and height fit the content inside the box and center it', async () => {
    const figma = fakeFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', width: 32, height: 16 });

    assert.equal(result.warnings, undefined);
    assert.deepEqual([result.node.width, result.node.height], [32, 16]);
    // 24×24 fits a 32×16 box at 2/3 scale, as 16×16, centered with 8px either side.
    const [stroke] = figma.currentPage.children[0].children;
    close(stroke.x, 6 * (2 / 3) + 8, 'stroke x');
    close(stroke.y, 6 * (2 / 3), 'stroke y');
    close(stroke.width, 8, 'stroke width');
    close(stroke.strokeWeight, 4 / 3, 'stroke weight');
  });

  test('shrinks past rescale()\'s 0.01 limit in steps', async () => {
    const figma = fakeFigma({
      importSvg: () => svgFrame({
        width: 2400,
        height: 2400,
        shapes: [{ x: 200, y: 200, width: 2000, height: 2000, strokeWeight: 150 }]
      })
    });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', width: 16 });

    assert.equal(result.success, true);
    assert.equal(result.warnings, undefined);
    close(result.node.width, 16, 'frame width');
    const [shape] = figma.currentPage.children[0].children;
    close(shape.strokeWeight, 1, 'stroke weight');
  });

  test('flatten merges the shapes into one vector inside the frame', async () => {
    const figma = fakeFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', flatten: true, width: 48 });

    const [frame] = figma.currentPage.children;
    assert.equal(figma.flattenCalls.length, 1);
    assert.equal(figma.flattenCalls[0].parent, frame, 'flatten() is given the frame, not the page default');
    assert.equal(figma.flattenCalls[0].nodes.length, 2);

    assert.equal(frame.children.length, 1);
    const [vector] = frame.children;
    assert.equal(vector.type, 'VECTOR');
    assert.equal(result.vectorId, vector.id);
    assert.equal(result.warnings, undefined, 'shapes in one paint flatten without a warning');
    assert.deepEqual([frame.width, frame.height], [48, 48], 'the frame keeps the viewBox padding');
    close(vector.strokeWeight, 4, 'the merged stroke scales with the icon');
  });

  test('flatten warns when it merges shapes painted differently', async () => {
    const cases = {
      'strokes in two colors': [
        LUCIDE_STROKE,
        { ...LUCIDE_STROKE, strokes: [{ type: 'SOLID', color: { r: 0.86, g: 0.15, b: 0.15 } }] }
      ],
      'a filled dot beside a stroked line': [
        LUCIDE_STROKE,
        { fills: [INK], strokes: [] }
      ],
      'a duotone layer in a group at reduced opacity': [
        LUCIDE_STROKE,
        new FakeContainer('GROUP', { opacity: 0.4, children: [new FakeNode('VECTOR', LUCIDE_STROKE)] })
      ]
    };

    for (const [label, shapes] of Object.entries(cases)) {
      const figma = fakeFigma({ importSvg: () => svgFrame({ shapes }) });
      loadPlugin(figma);
      const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', flatten: true });

      assert.equal(result.success, true, label);
      assert.ok(result.vectorId, label);
      assert.equal(result.warnings && result.warnings.length, 1, label);
      assert.match(result.warnings[0], /painted 2 different ways/, label);
    }
  });

  test('an SVG with nothing to draw imports as an empty frame with a warning, unflattened', async () => {
    const figma = fakeFigma({ importSvg: () => svgFrame({ shapes: [] }) });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', flatten: true });

    assert.equal(result.success, true);
    assert.equal(figma.flattenCalls.length, 0);
    assert.equal(result.vectorId, undefined);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /empty frame/);
  });

  test('markup Figma cannot parse fails with INVALID_SVG and leaves nothing', async () => {
    const figma = fakeFigma({
      importSvg: () => {
        throw new Error('Failed to parse SVG');
      }
    });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg><path d="M0 0' });

    assert.equal(result.error.code, 'INVALID_SVG');
    assert.match(result.error.message, /Failed to parse SVG/);
    assert.equal(figma.currentPage.children.length, 0);
    assert.equal(figma.undoCommits, 1);
  });

  test('a missing parent fails with NODE_NOT_FOUND before the import', async () => {
    const figma = fakeFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', parentId: '9:99' });

    assert.equal(result.error.code, 'NODE_NOT_FOUND');
    assert.match(result.error.message, /9:99/);
    assert.equal(figma.imports, 0);
  });

  test('a parent that cannot hold children fails with INVALID_PARAMS before the import', async () => {
    const figma = fakeFigma();
    const rectangle = new FakeNode('RECTANGLE', { width: 10, height: 10 });
    figma.currentPage.appendChild(rectangle);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', parentId: rectangle.id });

    assert.equal(result.error.code, 'INVALID_PARAMS');
    assert.match(result.error.message, /RECTANGLE/);
    assert.equal(figma.imports, 0);
  });

  test('a failure after the import removes the imported frame', async () => {
    const figma = fakeFigma();
    const instance = new FakeInstance();
    figma.currentPage.appendChild(instance);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', parentId: instance.id });

    assert.equal(result.error.code, 'OPERATION_FAILED');
    assert.match(result.error.message, /instance/);
    assert.equal(figma.imports, 1);
    assert.deepEqual(figma.currentPage.children, [instance], 'the imported frame is gone');
    assert.equal(figma.undoCommits, 1);
  });

  test('imports into a frame, positioned relative to it', async () => {
    const figma = fakeFigma();
    const card = new FakeFrame({ width: 200, height: 100, x: 500, y: 500 });
    figma.currentPage.appendChild(card);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', parentId: card.id, x: 8, y: 12 });

    assert.equal(result.node.parentId, card.id);
    assert.deepEqual([result.node.x, result.node.y], [8, 12]);
    assert.deepEqual(figma.currentPage.children, [card]);
  });

  test('loads another page before importing into it', async () => {
    const icons = new FakePage('Icons', { loaded: false });
    const figma = fakeFigma({ pages: [icons] });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_svg', { svg: '<svg/>', parentId: icons.id });

    assert.equal(result.success, true);
    assert.equal(icons.loaded, true);
    assert.equal(result.node.parentId, icons.id);
    assert.equal(result.node.pageId, icons.id);
    assert.equal(figma.currentPage.children.length, 0);
  });
});
