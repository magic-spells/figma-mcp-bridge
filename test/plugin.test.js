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
    this.rotation = 0;
    if (fills !== undefined) this.fills = fills;
    if (strokes !== undefined) this.strokes = strokes;
    if (strokeWeight !== undefined) this.strokeWeight = strokeWeight;
  }

  remove() {
    if (this.parent) this.parent.detach(this);
    this.removed = true;
  }

  // Binds a variable to a node field (visible, opacity, …), as an alias.
  setBoundVariable(field, variable) {
    this.boundVariables = { ...(this.boundVariables || {}), [field]: { type: 'VARIABLE_ALIAS', id: variable.id } };
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

  insertChild(index, node) {
    if (node.parent) node.parent.detach(node);
    this.children.splice(index, 0, node);
    node.parent = this;
  }

  detach(node) {
    this.children.splice(this.children.indexOf(node), 1);
    node.parent = null;
  }

  // Depth-first, in layer order, as Figma's findAll walks.
  findAll(predicate) {
    const found = [];
    for (const child of this.children) {
      if (predicate(child)) found.push(child);
      if (child.findAll) found.push(...child.findAll(predicate));
    }
    return found;
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

  insertChild(index, node) {
    if (!this.loaded) throw new Error('The page has not been loaded. Call loadAsync() first.');
    super.insertChild(index, node);
  }
}

class FakeText extends FakeNode {
  constructor({ characters = '', textStyleId = '', ...props } = {}) {
    super('TEXT', props);
    this.characters = characters;
    this.textStyleId = textStyleId;
  }
}

/**
 * A component; a variant when it sits in a FakeComponentSet. As in Figma, a
 * variant has variantProperties and reading its componentPropertyDefinitions
 * throws (the set holds them).
 *
 * `textLayers` are the text layers its instances get: { name, characters,
 * ref, live }. `ref` names the TEXT property the layer's characters are bound
 * to (componentPropertyReferences.characters), or null for an unbound layer;
 * a bound layer shows the property's value unless `live` is false, which
 * models a layer that stopped following its property.
 */
class FakeComponent extends FakeContainer {
  constructor({ key, remote = true, variantProperties = null, definitions = {}, textLayers = [], ...props } = {}) {
    super('COMPONENT', { width: 80, height: 32, ...props });
    this.key = key;
    this.remote = remote;
    this.variantProperties = variantProperties;
    this.ownDefinitions = definitions;
    this.textLayers = textLayers;
  }

  get componentPropertyDefinitions() {
    if (this.parent && this.parent.type === 'COMPONENT_SET') {
      throw new Error('Can only get component property definitions of a component set or non-variant component');
    }
    return this.ownDefinitions;
  }

  createInstance() {
    return new FakeInstance(this);
  }
}

class FakeComponentSet extends FakeContainer {
  constructor({ key, remote = true, definitions, ...props }) {
    super('COMPONENT_SET', props);
    this.key = key;
    this.remote = remote;
    this.componentPropertyDefinitions = definitions;
  }

  get defaultVariant() {
    return this.children[0];
  }
}

/**
 * An instance of `main`. setProperties switches variants by matching the
 * merged variant values to a sibling variant, and stores the other values as
 * overrides; componentProperties reads them back. `ignore` names properties
 * setProperties silently drops, to model a write that does not land.
 */
class FakeInstance extends FakeContainer {
  constructor(main = null, { ignore = [] } = {}) {
    super('INSTANCE', { name: main ? main.name : 'INSTANCE', width: main ? main.width : 100, height: main ? main.height : 40 });
    this.main = main;
    this.overrides = {};
    this.ignore = ignore;
    this.buildLayers();
  }

  // The main component's text layers, rebuilt when the variant changes.
  buildLayers() {
    for (const child of this.children.slice()) child.remove();
    for (const layer of (this.main && this.main.textLayers) || []) {
      const text = new FakeText({ name: layer.name, characters: layer.characters });
      text.componentPropertyReferences = layer.ref ? { characters: layer.ref } : null;
      if (layer.ref && layer.live !== false) {
        Object.defineProperty(text, 'characters', { get: () => this.componentProperties[layer.ref].value });
      }
      FakeContainer.prototype.appendChild.call(this, text);
    }
  }

  appendChild() {
    throw new Error('Cannot move node. New parent is an instance or is inside of an instance');
  }

  async getMainComponentAsync() {
    return this.main;
  }

  definitions() {
    const set = this.main.parent && this.main.parent.type === 'COMPONENT_SET' ? this.main.parent : null;
    return set ? set.componentPropertyDefinitions : this.main.componentPropertyDefinitions;
  }

  get componentProperties() {
    const result = {};
    for (const [name, def] of Object.entries(this.definitions())) {
      const value = def.type === 'VARIANT'
        ? this.main.variantProperties[name]
        : (name in this.overrides ? this.overrides[name] : def.defaultValue);
      result[name] = { type: def.type, value };
    }
    return result;
  }

  setProperties(properties) {
    const definitions = this.definitions();
    const variantValues = { ...(this.main.variantProperties || {}) };
    for (const [name, value] of Object.entries(properties)) {
      if (!(name in definitions)) throw new Error(`Could not find a component property with name: '${name}'`);
      if (this.ignore.includes(name)) continue;
      if (definitions[name].type === 'VARIANT') variantValues[name] = value;
      else this.overrides[name] = value;
    }
    if (this.main.variantProperties) {
      const set = this.main.parent;
      const match = set.children.find((variant) =>
        Object.entries(variantValues).every(([name, value]) => variant.variantProperties[name] === value));
      if (!match) throw new Error('No variant matches ' + JSON.stringify(variantValues));
      if (match !== this.main) {
        this.main = match;
        this.width = match.width;
        this.height = match.height;
        this.buildLayers();
      }
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }
}

const BUTTON_DEFINITIONS = {
  Variant: { type: 'VARIANT', defaultValue: 'Primary', variantOptions: ['Primary', 'Secondary'] },
  Size: { type: 'VARIANT', defaultValue: 'default', variantOptions: ['default', 'sm'] },
  'Label#12:0': { type: 'TEXT', defaultValue: 'Button' },
  'Show icon#3:1': { type: 'BOOLEAN', defaultValue: false },
  'Icon#4:2': { type: 'INSTANCE_SWAP', defaultValue: '9:1' }
};

/**
 * A published Button set: Variant × Size, with label, icon toggle and icon
 * swap. Each variant's "Label" text layer is bound to Label#12:0, except in
 * the variants named in `unbound` ("Secondary-sm"), whose layer just says
 * "Button", and in `stale`, whose layer is bound but does not follow it.
 */
function buttonSet({ unbound = [], stale = [] } = {}) {
  const variants = [];
  for (const variant of ['Primary', 'Secondary']) {
    for (const size of ['default', 'sm']) {
      const id = `${variant}-${size}`;
      variants.push(new FakeComponent({
        name: `Variant=${variant}, Size=${size}`,
        key: `key-${variant}-${size}`,
        variantProperties: { Variant: variant, Size: size },
        width: size === 'sm' ? 64 : 80,
        height: size === 'sm' ? 28 : 36,
        textLayers: [{
          name: 'Label',
          characters: 'Button',
          ref: unbound.includes(id) ? null : 'Label#12:0',
          live: !stale.includes(id)
        }]
      }));
    }
  }
  return new FakeComponentSet({ name: 'Button', key: 'key-button-set', definitions: BUTTON_DEFINITIONS, children: variants });
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
function fakeFigma({ importSvg = () => svgFrame(), pages = [], library = {} } = {}) {
  const currentPage = new FakePage('Page 1');
  const root = new FakeContainer('DOCUMENT', { name: 'Test file', children: [currentPage, ...pages] });
  const posted = [];
  // Team library: published nodes by key. An import makes the node reachable
  // by id, as Figma's import adds the remote node to the file.
  const componentSets = library.componentSets || {};
  const components = library.components || {};
  const styles = library.styles || {};
  const imported = [];
  const importFrom = (registry, key, what) => {
    figma.libraryImports.push(key);
    const node = registry[key];
    if (!node) return Promise.reject(new Error(`Failed to import ${what} by key "${key}"`));
    imported.push(node);
    return Promise.resolve(node);
  };

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
    libraryImports: [],
    importComponentSetByKeyAsync: (key) => importFrom(componentSets, key, 'component set'),
    importComponentByKeyAsync: (key) => importFrom(components, key, 'component'),
    importStyleByKeyAsync: (key) => importFrom(styles, key, 'style'),
    variables: {
      async getVariableByIdAsync(id) {
        return (library.variables || {})[id] || null;
      }
    },
    async getStyleByIdAsync(id) {
      return Object.values(styles).find((style) => style.id === id) || null;
    },
    async getNodeByIdAsync(id) {
      const stack = [root, ...imported];
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

/** Load plugin/code.js against `figma`, as Figma does when the plugin starts. Returns its globals. */
function loadPlugin(figma) {
  const context = vm.createContext({ figma, __html__: '', console });
  vm.runInContext(PLUGIN_SOURCE, context, { filename: 'plugin/code.js' });
  return context;
}

/**
 * Send one command through the plugin's message handler; resolve to its
 * response payload, serialized as postMessage would (which also brings the
 * sandbox's objects into this realm, so deepEqual can compare them).
 */
async function sendCommand(figma, command, payload) {
  await figma.ui.onmessage({ type: 'command', requestId: 'req-1', command, payload });
  const response = figma.posted.at(-1);
  assert.equal(response.type, 'command_response');
  assert.equal(response.requestId, 'req-1');
  return JSON.parse(JSON.stringify(response.payload));
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

// ------------------------------------------------------------
// Library components, styles and instance properties
// ------------------------------------------------------------

/**
 * A fake file with the Button set published under its key and each variant's.
 * `extra` adds library entries (styles, variables); `setOptions` go to buttonSet.
 */
function libraryFigma(extra = {}, setOptions = {}) {
  const set = buttonSet(setOptions);
  const components = {};
  for (const variant of set.children) components[variant.key] = variant;
  const figma = fakeFigma({ library: { componentSets: { [set.key]: set }, components, ...extra } });
  return { figma, set };
}

describe('import_library_component', () => {
  test('a set key with includeVariants returns its property definitions and every variant', async () => {
    const { figma, set } = libraryFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'import_library_component', { key: set.key, includeVariants: true });

    assert.equal(result.success, true);
    assert.equal(result.nodeId, set.id);
    assert.equal(result.type, 'COMPONENT_SET');
    assert.equal(result.remote, true);
    assert.deepEqual(result.componentPropertyDefinitions.Variant, BUTTON_DEFINITIONS.Variant);
    assert.equal(result.componentPropertyDefinitions['Label#12:0'].type, 'TEXT');
    assert.deepEqual(result.defaultVariant, { id: set.children[0].id, name: 'Variant=Primary, Size=default' });
    assert.equal(result.variantCount, 4);
    assert.deepEqual(result.variants[3], {
      id: set.children[3].id,
      name: 'Variant=Secondary, Size=sm',
      key: 'key-Secondary-sm',
      variantProperties: { Variant: 'Secondary', Size: 'sm' }
    });
    assert.deepEqual(figma.libraryImports, [set.key], 'auto tries the set first');
  });

  test('a variant key falls back to the component import and names its set', async () => {
    const { figma, set } = libraryFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'import_library_component', { key: 'key-Secondary-sm' });

    assert.equal(result.type, 'COMPONENT');
    assert.deepEqual(result.variantProperties, { Variant: 'Secondary', Size: 'sm' });
    assert.deepEqual(result.parentSet, { id: set.id, name: 'Button', key: set.key });
    assert.deepEqual(Object.keys(result.componentPropertyDefinitions), Object.keys(BUTTON_DEFINITIONS));
  });

  test('by default the variant list is left out: the definitions are enough to pick a variant', async () => {
    const { figma, set } = libraryFigma();
    loadPlugin(figma);
    for (const payload of [{ key: set.key }, { key: set.key, includeVariants: false }]) {
      const result = await sendCommand(figma, 'import_library_component', payload);
      assert.equal(result.variants, undefined, JSON.stringify(payload));
      assert.equal(result.variantCount, 4);
      assert.deepEqual(result.componentPropertyDefinitions.Size.variantOptions, ['default', 'sm']);
    }
  });

  test('an unpublished key fails with LIBRARY_IMPORT_FAILED after both attempts', async () => {
    const { figma } = libraryFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'import_library_component', { key: 'nope' });

    assert.equal(result.error.code, 'LIBRARY_IMPORT_FAILED');
    assert.match(result.error.message, /componentSet: Failed to import component set/);
    assert.match(result.error.message, /component: Failed to import component/);
    assert.deepEqual(figma.libraryImports, ['nope', 'nope']);
  });
});

describe('import_library_style', () => {
  test('imports each key and reports the ones that failed', async () => {
    const body = { id: 'S:body,', key: 'key-body', name: 'Body/Default', type: 'TEXT', remote: true };
    const { figma } = libraryFigma({ styles: { 'key-body': body } });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'import_library_style', { keys: ['key-body', 'key-gone'] });

    assert.equal(result.success, false);
    assert.deepEqual(result.styles, [{ key: 'key-body', id: 'S:body,', name: 'Body/Default', type: 'TEXT', remote: true }]);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].key, 'key-gone');
    assert.equal(result.errors[0].code, 'LIBRARY_IMPORT_FAILED');
  });
});

describe('create_instance', () => {
  test('a library key with properties picks the variant and sets the label', async () => {
    const { figma, set } = libraryFigma();
    const toolbar = new FakeFrame({ name: 'Toolbar', width: 400, height: 48 });
    toolbar.appendChild(new FakeNode('RECTANGLE'));
    figma.currentPage.appendChild(toolbar);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', {
      componentKey: set.key,
      properties: { Variant: 'Secondary', Size: 'sm', Label: 'Save', 'Show icon#3:1': true },
      parentId: toolbar.id,
      index: 0,
      x: 8,
      y: 4
    });

    assert.equal(result.success, true, JSON.stringify(result.error));
    const instance = toolbar.children[0];
    assert.equal(result.nodeId, instance.id, 'inserted at index 0');
    assert.equal(instance.main, set.children[3]);
    assert.deepEqual([instance.x, instance.y], [8, 4]);
    assert.deepEqual(result.mainComponent, {
      id: set.children[3].id,
      name: 'Variant=Secondary, Size=sm',
      key: 'key-Secondary-sm',
      remote: true,
      parentSet: { id: set.id, name: 'Button', key: set.key }
    });
    assert.deepEqual(result.componentProperties, {
      Variant: 'Secondary', Size: 'sm', 'Label#12:0': 'Save', 'Show icon#3:1': true, 'Icon#4:2': '9:1'
    });
  });

  test('the response is compact by default; compact: false returns the full node', async () => {
    const { figma, set } = libraryFigma();
    loadPlugin(figma);
    const compact = await sendCommand(figma, 'create_instance', { componentKey: set.key, x: 8, y: 4 });

    assert.equal(compact.success, true, JSON.stringify(compact.error));
    assert.deepEqual(compact.node, {
      id: compact.nodeId,
      name: 'Variant=Primary, Size=default',
      type: 'INSTANCE',
      parentId: figma.currentPage.id,
      x: 8,
      y: 4,
      width: 80,
      height: 36,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false
    });
    assert.equal(compact.mainComponent.parentSet.name, 'Button');
    assert.equal(compact.componentProperties['Label#12:0'], 'Button');

    const full = await sendCommand(figma, 'create_instance', { componentKey: set.key, compact: false });
    assert.equal(full.node.pageId, figma.currentPage.id, 'the full serialization');
    assert.equal(full.node.rotation, 0);
  });

  test('a TEXT property whose text layer is not bound to it succeeds with TEXT_PROPERTY_UNBOUND', async () => {
    const { figma, set } = libraryFigma({}, { unbound: ['Secondary-sm'] });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', {
      componentKey: set.key, properties: { Variant: 'Secondary', Size: 'sm', Label: 'Save' }
    });

    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(result.componentProperties['Label#12:0'], 'Save', 'the property itself reads back');
    const instance = figma.currentPage.children[0];
    assert.equal(instance.children[0].characters, 'Button', 'but the layer still shows the default');
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /^TEXT_PROPERTY_UNBOUND: /);
    assert.match(result.warnings[0], /"Label#12:0"/);
    assert.match(result.warnings[0], /variant "Variant=Secondary, Size=sm" of "Button"/);
  });

  test('a TEXT property its layer shows comes back without warnings', async () => {
    const { figma, set } = libraryFigma({}, { unbound: ['Secondary-sm'] });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', { componentKey: set.key, properties: { Label: 'Save' } });

    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(figma.currentPage.children[0].children[0].characters, 'Save');
    assert.equal(result.warnings, undefined);
  });

  test('a local component set by id instantiates its default variant', async () => {
    const figma = fakeFigma();
    const set = buttonSet();
    figma.currentPage.appendChild(set);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', { componentId: set.id });

    assert.equal(result.success, true);
    assert.equal(result.mainComponentId, set.children[0].id);
    assert.equal(figma.currentPage.children.at(-1).id, result.nodeId);
  });

  test('an unknown variant option fails with the options and leaves nothing behind', async () => {
    const { figma, set } = libraryFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', { componentKey: set.key, properties: { Variant: 'Ghost' } });

    assert.equal(result.error.code, 'INVALID_PROPERTIES');
    assert.match(result.error.message, /"Ghost" is not an option of variant property "Variant"\. Options: Primary, Secondary/);
    assert.equal(figma.currentPage.children.length, 0);
  });

  test('an out-of-range index fails before anything is imported', async () => {
    const { figma, set } = libraryFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', { componentKey: set.key, index: 1 });

    assert.equal(result.error.code, 'INVALID_PARAMS');
    assert.match(result.error.message, /out of range/);
    assert.deepEqual(figma.libraryImports, []);
  });

  test('a missing parent fails with NODE_NOT_FOUND', async () => {
    const { figma, set } = libraryFigma();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', { componentKey: set.key, parentId: '9:99' });
    assert.equal(result.error.code, 'NODE_NOT_FOUND');
  });

  test('a node that is not a component fails with NOT_A_COMPONENT', async () => {
    const figma = fakeFigma();
    const frame = new FakeFrame({});
    figma.currentPage.appendChild(frame);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'create_instance', { componentId: frame.id });
    assert.equal(result.error.code, 'NOT_A_COMPONENT');
  });
});

describe('set_instance_properties', () => {
  function placedInstance(options) {
    const { figma, set } = libraryFigma();
    const instance = new FakeInstance(set.children[0], options);
    figma.currentPage.appendChild(instance);
    return { figma, set, instance };
  }

  test('switches the variant, sets text and swaps the icon by library key', async () => {
    const { figma, set, instance } = placedInstance();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'set_instance_properties', {
      instanceId: instance.id,
      properties: { Size: 'sm', 'Label#12:0': 'Cancel', Icon: 'key-Primary-default' }
    });

    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.deepEqual(result.applied, { Size: 'sm', 'Label#12:0': 'Cancel', 'Icon#4:2': set.children[0].id });
    assert.equal(result.mainComponent.name, 'Variant=Primary, Size=sm');
    assert.equal(result.componentProperties.Size, 'sm');
    assert.equal(result.componentProperties['Label#12:0'], 'Cancel');
    assert.deepEqual([result.width, result.height], [64, 28]);
  });

  test('checks the text layers bound to a TEXT property show its value', async () => {
    const { figma, set } = libraryFigma({}, { unbound: ['Primary-sm'], stale: ['Secondary-default'] });
    const instance = new FakeInstance(set.children[0]);
    figma.currentPage.appendChild(instance);
    loadPlugin(figma);

    const shown = await sendCommand(figma, 'set_instance_properties', { instanceId: instance.id, properties: { Label: 'Cancel' } });
    assert.equal(shown.success, true, JSON.stringify(shown.error));
    assert.equal(shown.warnings, undefined);
    assert.equal(instance.children[0].characters, 'Cancel');

    const unbound = await sendCommand(figma, 'set_instance_properties', {
      instanceId: instance.id, properties: { Size: 'sm', Label: 'Close' }
    });
    assert.equal(unbound.success, true, JSON.stringify(unbound.error));
    assert.equal(unbound.warnings.length, 1);
    assert.match(unbound.warnings[0], /^TEXT_PROPERTY_UNBOUND: .*variant "Variant=Primary, Size=sm" of "Button"/);

    const stale = await sendCommand(figma, 'set_instance_properties', {
      instanceId: instance.id, properties: { Variant: 'Secondary', Size: 'default', Label: 'Done' }
    });
    assert.equal(stale.success, true, JSON.stringify(stale.error));
    assert.equal(stale.warnings.length, 1);
    assert.match(stale.warnings[0], /^TEXT_PROPERTY_NOT_RENDERED: /);
    assert.match(stale.warnings[0], /"Label" shows "Button"/);
  });

  test('line endings do not count as a mismatch', async () => {
    const { figma, set } = libraryFigma({}, { stale: ['Primary-default'] });
    const instance = new FakeInstance(set.children[0]);
    figma.currentPage.appendChild(instance);
    instance.children[0].characters = 'Save\nnow';
    loadPlugin(figma);
    const result = await sendCommand(figma, 'set_instance_properties', {
      instanceId: instance.id, properties: { Label: 'Save\r\nnow' }
    });
    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(result.warnings, undefined);
  });

  test('only TEXT properties are checked against text layers', async () => {
    const { figma, set } = libraryFigma({}, { unbound: ['Primary-sm'] });
    const instance = new FakeInstance(set.children[0]);
    figma.currentPage.appendChild(instance);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'set_instance_properties', {
      instanceId: instance.id, properties: { Size: 'sm', 'Show icon#3:1': true }
    });
    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(result.warnings, undefined);
  });

  test('a boolean stands for a "true"/"false" variant option', () => {
    const context = loadPlugin(fakeFigma());
    const definitions = { Disabled: { type: 'VARIANT', defaultValue: 'false', variantOptions: ['true', 'false'] } };
    const resolved = context.resolvePropertyAssignments(definitions, { Disabled: true });
    assert.deepEqual({ ...resolved.assignments }, { Disabled: 'true' });
  });

  test('an unknown or ambiguous name fails with INVALID_PROPERTIES', () => {
    const context = loadPlugin(fakeFigma());
    const definitions = {
      'Label#1:0': { type: 'TEXT', defaultValue: '' },
      'Label#2:0': { type: 'TEXT', defaultValue: '' }
    };
    assert.throws(() => context.resolvePropertyAssignments(definitions, { Label: 'x' }),
      (e) => e.code === 'INVALID_PROPERTIES' && /ambiguous/.test(e.message));
    assert.throws(() => context.resolvePropertyAssignments(definitions, { Title: 'x' }),
      (e) => e.code === 'INVALID_PROPERTIES' && /Label#1:0 \(TEXT\)/.test(e.message));
    assert.throws(() => context.resolvePropertyAssignments(definitions, { 'Label#1:0': true }),
      (e) => e.code === 'INVALID_PROPERTIES' && /takes a string/.test(e.message));
  });

  test('a value that does not read back fails with PROPERTIES_NOT_APPLIED', async () => {
    const { figma, instance } = placedInstance({ ignore: ['Label#12:0'] });
    loadPlugin(figma);
    const result = await sendCommand(figma, 'set_instance_properties', {
      instanceId: instance.id,
      properties: { Label: 'Cancel' }
    });

    assert.equal(result.error.code, 'PROPERTIES_NOT_APPLIED');
    assert.match(result.error.message, /Label#12:0 reads back as "Button", not "Cancel"/);
  });

  test('a node that is not an instance fails with NOT_AN_INSTANCE', async () => {
    const figma = fakeFigma();
    const frame = new FakeFrame({});
    figma.currentPage.appendChild(frame);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'set_instance_properties', { instanceId: frame.id, properties: { Size: 'sm' } });
    assert.equal(result.error.code, 'NOT_AN_INSTANCE');
  });
});

describe('replace_with_instance', () => {
  /** A hand-made "Save" button between two siblings in `parent`. */
  function handMadeButton(parent) {
    const button = new FakeFrame({ name: 'Save button', x: 40, y: 12, width: 120, height: 40 });
    button.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
    button.appendChild(new FakeText({ characters: 'Save' }));
    parent.appendChild(new FakeNode('RECTANGLE'));
    parent.appendChild(button);
    parent.appendChild(new FakeNode('RECTANGLE'));
    return button;
  }

  test('takes the target\'s index, position and constraints, copies its text, and deletes it', async () => {
    const { figma, set } = libraryFigma();
    const card = new FakeFrame({ name: 'Card', width: 300, height: 200 });
    figma.currentPage.appendChild(card);
    const target = handMadeButton(card);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', {
      targetId: target.id, componentKey: set.key, properties: { Variant: 'Secondary' }, textProperty: 'Label'
    });

    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(target.removed, true);
    assert.equal(result.replacedId, target.id);
    const instance = card.children[1];
    assert.equal(card.children.length, 3);
    assert.equal(instance.id, result.nodeId);
    assert.deepEqual([instance.x, instance.y], [40, 12]);
    assert.deepEqual({ ...instance.constraints }, { horizontal: 'MAX', vertical: 'CENTER' });
    assert.deepEqual([instance.width, instance.height], [80, 36], 'the component keeps its own size');
    assert.equal(result.componentProperties['Label#12:0'], 'Save');
    assert.equal(result.componentProperties.Variant, 'Secondary');
    assert.equal(result.copiedText.text, 'Save');
    assert.equal(result.warnings, undefined);
  });

  test('keeps the target\'s visibility, lock, opacity, rotation and name', async () => {
    const { figma, set } = libraryFigma();
    const card = new FakeFrame({ name: 'Card', width: 300, height: 200 });
    figma.currentPage.appendChild(card);
    const target = handMadeButton(card);
    target.visible = false;
    target.locked = true;
    target.opacity = 0.5;
    target.rotation = 90;
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', { targetId: target.id, componentKey: set.key });

    assert.equal(result.success, true, JSON.stringify(result.error));
    const instance = card.children[1];
    assert.equal(instance.visible, false, 'a hidden target stays hidden');
    assert.equal(instance.locked, true);
    assert.equal(instance.opacity, 0.5);
    assert.equal(instance.rotation, 90);
    assert.equal(instance.name, 'Save button', 'the target\'s name when none is given');
    assert.equal(result.node.visible, false);
    assert.equal(result.node.name, 'Save button');
  });

  test('a name given wins over the target\'s', async () => {
    const { figma, set } = libraryFigma();
    const card = new FakeFrame({ name: 'Card' });
    figma.currentPage.appendChild(card);
    const target = handMadeButton(card);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', {
      targetId: target.id, componentKey: set.key, name: 'Save'
    });

    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(card.children[1].name, 'Save');
  });

  test('variables bound to visible and opacity are carried; one that is gone is a warning', async () => {
    const showSave = { id: 'VariableID:1:1', name: 'show-save' };
    const { figma, set } = libraryFigma({ variables: { [showSave.id]: showSave } });
    const card = new FakeFrame({ name: 'Card' });
    figma.currentPage.appendChild(card);
    const target = handMadeButton(card);
    target.boundVariables = {
      visible: { type: 'VARIABLE_ALIAS', id: showSave.id },
      opacity: { type: 'VARIABLE_ALIAS', id: 'VariableID:gone' }
    };
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', { targetId: target.id, componentKey: set.key });

    assert.equal(result.success, true, JSON.stringify(result.error));
    const instance = card.children[1];
    assert.deepEqual(instance.boundVariables, { visible: { type: 'VARIABLE_ALIAS', id: showSave.id } });
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /opacity.*VariableID:gone/);
  });

  test('inside a component, a visibility property bind is carried; a text bind is reported', async () => {
    const { figma, set } = libraryFigma();
    const card = new FakeComponent({ name: 'Card', key: 'key-card', remote: false });
    figma.currentPage.appendChild(card);
    const target = handMadeButton(card);
    target.componentPropertyReferences = { visible: 'Show save#7:0', characters: 'Title#8:0' };
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', { targetId: target.id, componentKey: set.key });

    assert.equal(result.success, true, JSON.stringify(result.error));
    const instance = card.children[1];
    assert.deepEqual({ ...instance.componentPropertyReferences }, { visible: 'Show save#7:0' });
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /characters was bound to component property "Title#8:0"/);
  });

  test('a hidden target inside auto-layout stays hidden and keeps FILL', async () => {
    const { figma, set } = libraryFigma();
    const form = new FakeFrame({ name: 'Form', width: 300, height: 200 });
    form.layoutMode = 'VERTICAL';
    figma.currentPage.appendChild(form);
    const target = handMadeButton(form);
    target.layoutSizingHorizontal = 'FILL';
    target.visible = false;
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', { targetId: target.id, componentKey: set.key });

    assert.equal(result.success, true, JSON.stringify(result.error));
    const instance = form.children[1];
    assert.equal(instance.visible, false);
    assert.equal(instance.layoutSizingHorizontal, 'FILL');
    assert.equal(result.node.visible, false);
  });

  test('the response is compact by default; compact: false returns the full node', async () => {
    const { figma, set } = libraryFigma();
    const card = new FakeFrame({ name: 'Card' });
    figma.currentPage.appendChild(card);
    const first = handMadeButton(card);
    loadPlugin(figma);
    const compact = await sendCommand(figma, 'replace_with_instance', { targetId: first.id, componentKey: set.key });
    assert.equal(compact.success, true, JSON.stringify(compact.error));
    assert.equal(compact.node.pageId, undefined);
    assert.deepEqual([compact.node.x, compact.node.y, compact.node.width, compact.node.height], [40, 12, 80, 36]);

    const second = handMadeButton(card);
    const full = await sendCommand(figma, 'replace_with_instance', { targetId: second.id, componentKey: set.key, compact: false });
    assert.equal(full.success, true, JSON.stringify(full.error));
    assert.equal(full.node.pageId, figma.currentPage.id);
  });

  test('copied text that its layer does not show is reported', async () => {
    const { figma, set } = libraryFigma({}, { unbound: ['Primary-default'] });
    const card = new FakeFrame({ name: 'Card' });
    figma.currentPage.appendChild(card);
    const target = handMadeButton(card);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', {
      targetId: target.id, componentKey: set.key, textProperty: 'Label'
    });

    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(result.copiedText.text, 'Save');
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /^TEXT_PROPERTY_UNBOUND: /);
  });

  test('inside auto-layout, an axis the target filled stays FILL; matchSize sizes the rest', async () => {
    const { figma, set } = libraryFigma();
    const form = new FakeFrame({ name: 'Form', width: 300, height: 200 });
    form.layoutMode = 'VERTICAL';
    figma.currentPage.appendChild(form);
    const target = handMadeButton(form);
    target.layoutSizingHorizontal = 'FILL';
    target.layoutSizingVertical = 'FIXED';
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', {
      targetId: target.id, componentKey: set.key, matchSize: true
    });

    assert.equal(result.success, true, JSON.stringify(result.error));
    const instance = form.children[1];
    assert.equal(instance.layoutSizingHorizontal, 'FILL');
    assert.equal(instance.height, 40, 'matchSize takes the target height');
    assert.equal(instance.constraints, undefined, 'constraints are not set inside auto-layout');
  });

  test('a failure removes the instance and leaves the target untouched', async () => {
    const { figma, set } = libraryFigma();
    const card = new FakeFrame({ name: 'Card' });
    figma.currentPage.appendChild(card);
    const target = handMadeButton(card);
    const before = card.children.slice();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', {
      targetId: target.id, componentKey: set.key, properties: { Tone: 'Loud' }
    });

    assert.equal(result.error.code, 'INVALID_PROPERTIES');
    assert.equal(target.removed, false);
    assert.deepEqual(card.children, before);
  });

  test('a target on a page that is not loaded yet: the page is loaded first', async () => {
    const other = new FakePage('Page 2', { loaded: false });
    const set = buttonSet();
    const figma = fakeFigma({ pages: [other], library: { componentSets: { [set.key]: set } } });
    const target = new FakeFrame({ name: 'Save button' });
    other.children.push(target);
    target.parent = other;
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', { targetId: target.id, componentKey: set.key });

    assert.equal(result.success, true, JSON.stringify(result.error));
    assert.equal(other.loaded, true);
    assert.deepEqual(other.children.map((n) => n.id), [result.nodeId]);
  });

  test('a component master is refused, since deleting it would detach its instances', async () => {
    const { figma } = libraryFigma();
    const local = buttonSet();
    const other = new FakeComponent({ name: 'Chip', key: 'key-chip', remote: false });
    figma.currentPage.appendChild(local);
    figma.currentPage.appendChild(other);
    loadPlugin(figma);

    for (const target of [local, other]) {
      const result = await sendCommand(figma, 'replace_with_instance', { targetId: target.id, componentKey: 'key-button-set' });
      assert.equal(result.error.code, 'INVALID_PARAMS');
      assert.match(result.error.message, /would detach every instance/);
      assert.equal(target.removed, false);
    }
  });

  test('a target holding the component it would be replaced by is refused', async () => {
    const figma = fakeFigma();
    const board = new FakeFrame({ name: 'Board' });
    const chip = new FakeComponent({ name: 'Chip', key: 'key-chip', remote: false });
    board.appendChild(chip);
    figma.currentPage.appendChild(board);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', { targetId: board.id, componentId: chip.id });

    assert.equal(result.error.code, 'INVALID_PARAMS');
    assert.match(result.error.message, /own main component/);
    assert.equal(board.removed, false);
    assert.deepEqual(figma.currentPage.children, [board], 'no instance left behind');
  });

  test('textProperty on a target without text fails before anything is created', async () => {
    const { figma, set } = libraryFigma();
    const rectangle = new FakeNode('RECTANGLE');
    figma.currentPage.appendChild(rectangle);
    loadPlugin(figma);
    const result = await sendCommand(figma, 'replace_with_instance', {
      targetId: rectangle.id, componentKey: set.key, textProperty: 'Label'
    });

    assert.equal(result.error.code, 'INVALID_PARAMS');
    assert.deepEqual(figma.libraryImports, []);
    assert.equal(rectangle.removed, false);
  });
});

describe('node reads: component and text style details', () => {
  function documentWithInstanceAndText() {
    const style = { id: 'S:heading,', key: 'key-heading', name: 'Heading/H2', type: 'TEXT' };
    const { figma, set } = libraryFigma({ styles: { 'key-heading': style } });
    const instance = new FakeInstance(set.children[2]);
    const heading = new FakeText({ characters: 'Title', textStyleId: style.id });
    const plain = new FakeText({ characters: 'Plain' });
    const mixed = new FakeText({ characters: 'Mixed', textStyleId: figma.mixed });
    for (const node of [instance, heading, plain, mixed]) figma.currentPage.appendChild(node);
    return { figma, set, instance, heading, plain, mixed };
  }

  test('figma_get_nodes adds mainComponent, componentProperties and the text style', async () => {
    const { figma, set, instance, heading, plain, mixed } = documentWithInstanceAndText();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'get_nodes', { nodeIds: [instance.id, heading.id, plain.id, mixed.id] });
    const [instanceNode, headingNode, plainNode, mixedNode] = result.nodes;

    assert.deepEqual(instanceNode.mainComponent, {
      id: set.children[2].id,
      name: 'Variant=Secondary, Size=default',
      key: 'key-Secondary-default',
      remote: true,
      parentSet: { id: set.id, name: 'Button', key: set.key }
    });
    assert.equal(instanceNode.componentProperties.Variant, 'Secondary');
    assert.equal(instanceNode.componentProperties['Label#12:0'], 'Button');
    assert.equal(headingNode.textStyleId, 'S:heading,');
    assert.equal(headingNode.textStyleName, 'Heading/H2');
    assert.equal(plainNode.textStyleId, undefined);
    assert.equal(mixedNode.textStyleId, 'MIXED');
    assert.equal(mixedNode.textStyleName, undefined);
  });

  test('minimal depth skips the lookups', async () => {
    const { figma, instance } = documentWithInstanceAndText();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'get_nodes', { nodeIds: [instance.id], depth: 'minimal' });
    assert.equal(result.nodes[0].mainComponent, undefined);
    assert.equal(result.nodes[0].componentProperties, undefined);
  });

  test('a large read describes every instance and looks each text style up once', async () => {
    const style = { id: 'S:body,', key: 'key-body', name: 'Body', type: 'TEXT' };
    const { figma, set } = libraryFigma({ styles: { 'key-body': style } });
    let styleLookups = 0;
    const getStyle = figma.getStyleByIdAsync;
    figma.getStyleByIdAsync = (id) => { styleLookups++; return getStyle(id); };
    for (let i = 0; i < 120; i++) {
      figma.currentPage.appendChild(i % 2 ? new FakeInstance(set.children[i % 4]) : new FakeText({ textStyleId: style.id }));
    }
    loadPlugin(figma);
    const result = await sendCommand(figma, 'get_children', { parentId: figma.currentPage.id });

    assert.equal(result.children.length, 120);
    assert.deepEqual(result.children.map((n) => n.id), figma.currentPage.children.map((n) => n.id), 'order kept');
    assert.ok(result.children.filter((n) => n.type === 'INSTANCE').every((n) => n.mainComponent.parentSet.key === set.key));
    assert.ok(result.children.filter((n) => n.type === 'TEXT').every((n) => n.textStyleName === 'Body'));
    assert.equal(styleLookups, 1);
  });

  test('figma_get_children compact carries them too', async () => {
    const { figma } = documentWithInstanceAndText();
    loadPlugin(figma);
    const result = await sendCommand(figma, 'get_children', { parentId: figma.currentPage.id });
    const [instanceNode, headingNode] = result.children;

    assert.equal(instanceNode.mainComponent.parentSet.name, 'Button');
    assert.equal(instanceNode.componentProperties.Size, 'default');
    assert.equal(headingNode.textStyleName, 'Heading/H2');
  });
});
