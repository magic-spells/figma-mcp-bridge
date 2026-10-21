/**
 * Library components, styles and instance properties: the server-side half
 * (argument checks, handlers, tool schemas). The plugin half is in
 * plugin.test.js.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  MAX_STYLE_KEYS,
  validateComponentSource,
  validateProperties,
  normalizeStyleKeys
} from '../src/tools/components.js';
import {
  handleCreateInstance,
  handleImportLibraryComponent,
  handleImportLibraryStyle,
  handleSetInstanceProperties,
  handleReplaceWithInstance
} from '../src/tools/mutations.js';
import { registerTools } from '../src/tools/index.js';

const SET_KEY = '3f0c1a9e5b7d2c4e6a8b0d1f3e5c7a9b1d3f5e7c';

function fakeBridge({ connected = true, reply = { success: true } } = {}) {
  const sent = [];
  return {
    sent,
    isConnected: () => connected,
    async sendCommand(command, payload) {
      sent.push({ command, payload });
      return typeof reply === 'function' ? reply(command, payload) : reply;
    }
  };
}

function parse(response) {
  return JSON.parse(response.content[0].text);
}

describe('validateComponentSource', () => {
  test('accepts exactly one of componentKey and componentId', () => {
    assert.equal(validateComponentSource({ componentKey: SET_KEY }), null);
    assert.equal(validateComponentSource({ componentId: '12:34' }), null);
  });

  test('rejects both, neither, and empty values', () => {
    for (const args of [
      { componentKey: SET_KEY, componentId: '12:34' },
      {},
      { componentKey: '' },
      { componentId: '  ' },
      { componentKey: 42 }
    ]) {
      assert.equal(validateComponentSource(args).code, 'INVALID_PARAMS', JSON.stringify(args));
    }
  });
});

describe('validateProperties', () => {
  test('accepts string and boolean values, and absence when optional', () => {
    assert.equal(validateProperties(undefined), null);
    assert.equal(validateProperties({ Variant: 'Primary', 'Label#12:0': 'Save', 'Icon#3:1': false }), null);
  });

  test('rejects non-objects and other value types', () => {
    for (const properties of [null, 'Primary', ['Primary'], { Size: 2 }, { Size: null }, { '': 'x' }]) {
      const problem = validateProperties(properties);
      assert.equal(problem && problem.code, 'INVALID_PARAMS', JSON.stringify(properties));
    }
  });

  test('required means present and non-empty', () => {
    assert.equal(validateProperties(undefined, { required: true }).code, 'INVALID_PARAMS');
    assert.equal(validateProperties({}, { required: true }).code, 'INVALID_PARAMS');
    assert.equal(validateProperties({ Size: 'sm' }, { required: true }), null);
  });
});

describe('normalizeStyleKeys', () => {
  test('takes key, keys or both, deduplicated in order', () => {
    assert.deepEqual(normalizeStyleKeys({ key: 'a' }), { keys: ['a'] });
    assert.deepEqual(normalizeStyleKeys({ keys: ['a', 'b', 'a'] }), { keys: ['a', 'b'] });
    assert.deepEqual(normalizeStyleKeys({ key: 'b', keys: ['a', 'b'] }), { keys: ['b', 'a'] });
  });

  test('rejects no keys, empty keys and too many', () => {
    assert.equal(normalizeStyleKeys({}).problem.code, 'INVALID_PARAMS');
    assert.equal(normalizeStyleKeys({ keys: [] }).problem.code, 'INVALID_PARAMS');
    assert.equal(normalizeStyleKeys({ keys: ['a', ''] }).problem.code, 'INVALID_PARAMS');
    assert.equal(normalizeStyleKeys({ keys: 'a' }).problem.code, 'INVALID_PARAMS');

    const many = Array.from({ length: MAX_STYLE_KEYS + 1 }, (_, i) => `key-${i}`);
    assert.match(normalizeStyleKeys({ keys: many }).problem.message, /limit/);
    assert.equal(normalizeStyleKeys({ keys: many.slice(1) }).keys.length, MAX_STYLE_KEYS);
  });
});

describe('handlers', () => {
  test('figma_create_instance sends a library key and properties to the plugin', async () => {
    const bridge = fakeBridge({ reply: { success: true, nodeId: '5:1' } });
    const args = { componentKey: SET_KEY, properties: { Variant: 'Primary' }, parentId: '1:2', index: 0, x: 0, y: 0 };
    const response = await handleCreateInstance(bridge, args);

    assert.equal(response.isError, undefined);
    assert.deepEqual(bridge.sent, [{ command: 'create_instance', payload: args }]);
    assert.equal(parse(response).nodeId, '5:1');
  });

  test('figma_create_instance rejects a bad source or properties without calling the plugin', async () => {
    const bridge = fakeBridge();
    const both = await handleCreateInstance(bridge, { componentKey: SET_KEY, componentId: '1:1' });
    const badProps = await handleCreateInstance(bridge, { componentId: '1:1', properties: { Size: 2 } });

    for (const response of [both, badProps]) {
      assert.equal(response.isError, true);
      assert.equal(parse(response).error.code, 'INVALID_PARAMS');
    }
    assert.equal(bridge.sent.length, 0);
  });

  test('figma_import_library_component requires a key', async () => {
    const bridge = fakeBridge();
    const response = await handleImportLibraryComponent(bridge, { key: ' ' });
    assert.equal(parse(response).error.code, 'INVALID_PARAMS');
    assert.equal(bridge.sent.length, 0);

    await handleImportLibraryComponent(bridge, { key: SET_KEY, kind: 'auto', includeVariants: false });
    assert.deepEqual(bridge.sent, [{
      command: 'import_library_component',
      payload: { key: SET_KEY, kind: 'auto', includeVariants: false }
    }]);
  });

  test('figma_import_library_style sends one keys list, and a partial failure is an error', async () => {
    const bridge = fakeBridge({
      reply: {
        success: false,
        styles: [{ key: 'a', id: 'S:a,', name: 'Body/Default', type: 'TEXT' }],
        errors: [{ key: 'b', code: 'LIBRARY_IMPORT_FAILED', message: 'not published' }]
      }
    });
    const response = await handleImportLibraryStyle(bridge, { key: 'a', keys: ['b', 'a'] });

    assert.deepEqual(bridge.sent, [{ command: 'import_library_style', payload: { keys: ['a', 'b'] } }]);
    assert.equal(response.isError, true);
    const body = parse(response);
    assert.equal(body.styles[0].id, 'S:a,', 'the styles that imported are still reported');
    assert.equal(body.errors[0].key, 'b');
  });

  test('figma_import_library_style succeeds when every key imports', async () => {
    const bridge = fakeBridge({ reply: { success: true, styles: [] } });
    const response = await handleImportLibraryStyle(bridge, { keys: ['a'] });
    assert.equal(response.isError, undefined);
  });

  test('figma_set_instance_properties requires an instance and a non-empty map', async () => {
    const bridge = fakeBridge();
    assert.equal(parse(await handleSetInstanceProperties(bridge, { properties: { Size: 'sm' } })).error.code, 'INVALID_PARAMS');
    assert.equal(parse(await handleSetInstanceProperties(bridge, { instanceId: '1:9', properties: {} })).error.code, 'INVALID_PARAMS');
    assert.equal(bridge.sent.length, 0);

    await handleSetInstanceProperties(bridge, { instanceId: '1:9', properties: { Size: 'sm' } });
    assert.deepEqual(bridge.sent, [{ command: 'set_instance_properties', payload: { instanceId: '1:9', properties: { Size: 'sm' } } }]);
  });

  test('figma_replace_with_instance checks target, source and textProperty', async () => {
    const bridge = fakeBridge();
    for (const args of [
      { componentKey: SET_KEY },
      { targetId: '1:3' },
      { targetId: '1:3', componentKey: SET_KEY, textProperty: '' }
    ]) {
      assert.equal(parse(await handleReplaceWithInstance(bridge, args)).error.code, 'INVALID_PARAMS', JSON.stringify(args));
    }
    assert.equal(bridge.sent.length, 0);

    const args = { targetId: '1:3', componentKey: SET_KEY, textProperty: 'Label', properties: { Variant: 'Primary' } };
    await handleReplaceWithInstance(bridge, args);
    assert.deepEqual(bridge.sent, [{ command: 'replace_with_instance', payload: args }]);
  });

  test('report NOT_CONNECTED without calling the plugin', async () => {
    const bridge = fakeBridge({ connected: false });
    const responses = [
      await handleCreateInstance(bridge, { componentId: '1:1' }),
      await handleImportLibraryComponent(bridge, { key: SET_KEY }),
      await handleImportLibraryStyle(bridge, { key: 'a' }),
      await handleSetInstanceProperties(bridge, { instanceId: '1:9', properties: { Size: 'sm' } }),
      await handleReplaceWithInstance(bridge, { targetId: '1:3', componentId: '1:1' })
    ];
    for (const response of responses) {
      assert.equal(parse(response).error.code, 'NOT_CONNECTED');
    }
    assert.equal(bridge.sent.length, 0);
  });
});

describe('tool schemas', () => {
  // registerTools against a stand-in server that keeps each tool's Zod shape.
  const tools = new Map();
  registerTools({ tool: (name, description, shape) => tools.set(name, z.object(shape)) }, fakeBridge());

  test('registers the library tools', () => {
    for (const name of [
      'figma_import_library_component',
      'figma_import_library_style',
      'figma_create_instance',
      'figma_set_instance_properties',
      'figma_replace_with_instance'
    ]) {
      assert.ok(tools.has(name), name);
    }
    assert.equal(tools.size, 98, 'update the tool counts in README.md, CLAUDE.md and CHANGELOG.md');
  });

  test('properties take strings and booleans only', () => {
    const schema = tools.get('figma_set_instance_properties');
    assert.ok(schema.safeParse({ instanceId: '1:9', properties: { Variant: 'Primary', 'Icon#1:2': true } }).success);
    assert.ok(!schema.safeParse({ instanceId: '1:9', properties: { Size: 2 } }).success);
    assert.ok(!schema.safeParse({ instanceId: '1:9' }).success);
  });

  test('figma_create_instance accepts a key or an id, and a non-negative integer index', () => {
    const schema = tools.get('figma_create_instance');
    assert.ok(schema.safeParse({ componentKey: SET_KEY, properties: { Size: 'sm' }, index: 0 }).success);
    assert.ok(schema.safeParse({ componentId: '1:1' }).success);
    assert.ok(!schema.safeParse({ componentId: '1:1', index: -1 }).success);
    assert.ok(!schema.safeParse({ componentId: '1:1', index: 1.5 }).success);
  });

  test('figma_import_library_component defaults to auto without the variant list', () => {
    const parsed = tools.get('figma_import_library_component').parse({ key: SET_KEY });
    assert.deepEqual(parsed, { key: SET_KEY, kind: 'auto', includeVariants: false });
  });

  test('figma_create_instance and figma_replace_with_instance answer compactly by default', () => {
    assert.equal(tools.get('figma_create_instance').parse({ componentId: '1:1' }).compact, true);
    assert.equal(tools.get('figma_replace_with_instance').parse({ targetId: '1:3', componentId: '1:1' }).compact, true);
    assert.equal(tools.get('figma_create_instance').parse({ componentId: '1:1', compact: false }).compact, false);
  });

  test('figma_import_library_style caps keys', () => {
    const schema = tools.get('figma_import_library_style');
    assert.ok(schema.safeParse({ keys: ['a', 'b'] }).success);
    assert.ok(!schema.safeParse({ keys: Array.from({ length: MAX_STYLE_KEYS + 1 }, (_, i) => String(i)) }).success);
  });
});
