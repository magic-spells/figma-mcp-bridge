# Figma MCP Bridge - Developer Guide

MCP server enabling Claude to read and manipulate **Figma design files AND FigJam files** via WebSocket bridge to a Figma plugin. Supports flowcharts, diagrams, sticky notes, tables, code blocks, and link previews in FigJam alongside the full Figma design toolset — plus prototype interactions (reactions, flow starting points) in Figma Design files.

## Tech Stack
- Node.js (ES modules)
- `@modelcontextprotocol/sdk` for MCP protocol
- `ws` for WebSocket
- Zod for schema validation

## Architecture

```
Claude Code ←──stdio──→ MCP Server ←──WebSocket──→ Figma Plugin ←──→ Figma API
                        (Node.js)     ws://localhost:3055    (runs in Figma)
```

## File Structure

```
src/
├── index.js           # Entry point - starts WebSocket + MCP servers
├── server.js          # MCP server setup (McpServer configuration)
├── websocket.js       # FigmaBridge class - WebSocket connection management
└── tools/
    ├── index.js       # Tool registration with Zod schemas (93 tools — 68 Figma + 21 FigJam + 4 Prototype)
    ├── context.js     # figma_get_context handler
    ├── pages.js       # figma_list_pages handler
    ├── nodes.js       # figma_get_nodes handler
    └── mutations.js   # All mutation handlers (Figma + FigJam + Prototype)

plugin/
├── manifest.json      # Figma plugin configuration
├── code.js            # Main plugin - Figma API command handlers
└── ui.html            # WebSocket UI (runs in iframe)
```

## Adding New Commands

### 1. Add handler in `src/tools/mutations.js`

```javascript
export async function handleNewCommand(bridge, args) {
  if (!bridge.isConnected()) {
    return { error: { code: 'NOT_CONNECTED', message: '...' }, isError: true };
  }

  try {
    const result = await bridge.sendCommand('new_command', args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { error: { code: error.code || 'ERROR', message: error.message }, isError: true };
  }
}
```

### 2. Register tool in `src/tools/index.js`

```javascript
import { handleNewCommand } from './mutations.js';

// In registerTools function:
server.tool(
  'figma_new_command',
  'Description of what this command does',
  {
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().default(0).describe('Optional param')
  },
  async (args) => handleNewCommand(bridge, args)
);
```

### 3. Add command handler in `plugin/code.js`

```javascript
// In the command switch statement:
case 'new_command':
  const node = await figma.getNodeByIdAsync(payload.nodeId);
  if (!node) {
    return { error: { code: 'NODE_NOT_FOUND', message: `Node ${payload.nodeId} not found` } };
  }
  // Perform operation...
  return { success: true, nodeId: node.id };
```

### Adding a FigJam-only command

For commands that only make sense in FigJam (sticky notes, shapes-with-text, connectors, tables, code blocks, link previews), use the `requireFigJam()` guard at the top of the plugin handler. **Always pass the MCP tool name** — the error message names the tool, states it is FigJam only, and reports the current editor:

```javascript
async function createSticky(params) {
  requireFigJam('figma_create_sticky');  // throws WRONG_EDITOR outside FigJam
  var sticky = figma.createSticky();
  // ...
  await attachToParent(sticky, params.parentId);  // shared helper for parent attachment
  return { success: true, node: serializeNode(sticky, 'full') };
}
```

For text on FigJam sublayer-bearing nodes (`STICKY`, `SHAPE_WITH_TEXT`, `CONNECTOR`, `TABLE_CELL`), use the `loadFontForSublayer()` helper rather than reaching into `node.fontName`:

```javascript
await loadFontForSublayer(sticky.text);
sticky.text.characters = 'Hello';
```

For connectors, build endpoints with `buildConnectorEndpoint()` and validate with `validateConnectorMagnet()`:

```javascript
var startEndpoint = buildConnectorEndpoint(params.start);  // accepts { nodeId, magnet } | { nodeId, position } | { position }
validateConnectorMagnet(lineType, startEndpoint);          // STRAIGHT lines only allow CENTER/NONE magnets
```

`createSection` is the one exception — sections work in both editors, so it does NOT call `requireFigJam()`.

### Adding a Figma-Design-only command

Mirror of the FigJam pattern, for commands that only make sense in Figma Design files (prototype reactions, flow starting points). Use the `requireFigmaDesign()` guard at the top of the plugin handler:

```javascript
async function getReactions(params) {
  requireFigmaDesign('figma_get_reactions');  // throws FIGMA_DESIGN_ONLY outside Figma Design
  var node = await figma.getNodeByIdAsync(params.nodeId);
  // ...
}
```

The helper is at `plugin/code.js` next to `requireFigJam()`.

Both guards use an **explicit equality check**, never `!== 'figjam'`. `figma.editorType` has **five** values — `'figma' | 'figjam' | 'dev' | 'slides' | 'buzz'` — so a negated check would wrongly admit Dev Mode, Slides and Buzz. `describeCurrentEditor()` maps all five to a readable label for the error message.

## FigJam Tools Overview

| Tool | Creates / modifies | Notes |
|------|--------------------|-------|
| `figma_create_sticky` | `STICKY` | Width/height fixed; `text` is sublayer; author info auto-set by Figma (read-only) |
| `figma_set_sticky` | `STICKY` | `isWideWidth` toggle only — author props are read-only at runtime |
| `figma_create_shape_with_text` | `SHAPE_WITH_TEXT` | 30 `shapeType` values (ROUNDED_RECTANGLE, DIAMOND, ENG_DATABASE, …); `cornerRadius` is readonly |
| `figma_set_shape_type` | `SHAPE_WITH_TEXT` | Change shape variant |
| `figma_create_connector` | `CONNECTOR` | `start`/`end` endpoints, `lineType` (ELBOWED/STRAIGHT/CURVED), default `endCap: ARROW_EQUILATERAL` |
| `figma_set_connector` | `CONNECTOR` | Modify endpoints/caps/text after creation |
| `figma_create_section` | `SECTION` | **Works in both editors**; supports `devStatus` (READY_FOR_DEV/COMPLETED) |
| `figma_set_section` | `SECTION` | name, contents-hidden, devStatus |
| `figma_create_table` | `TABLE` | Optional `cells: [{ row, column, text }]` to seed content |
| `figma_set_table_cell` | `TABLE` | Set cell text/fill |
| `figma_insert_table_row` / `_column` | `TABLE` | Inserts BEFORE the given index |
| `figma_remove_table_row` / `_column` | `TABLE` | Remove row/column |
| `figma_resize_table_row` / `_column` | `TABLE` | Set row height / column width |
| `figma_move_table_row` / `_column` | `TABLE` | Reorder |
| `figma_create_code_block` | `CODE_BLOCK` | 17 `codeLanguage` values; `code` is plain string (no font load) |
| `figma_set_code_block` | `CODE_BLOCK` | Update code/language |
| `figma_create_link_preview` | `EMBED` or `LINK_UNFURL` | OEmbed URL → EMBED, others → LINK_UNFURL; response includes `nodeType` |

`figma_set_text` and `figma_set_text_style` were extended to handle the four sublayer-bearing FigJam node types (sticky, shape-with-text, connector, table cell) — call them with the parent node's id.

**FigJam-only node types we deliberately do NOT wrap creation for:** `STAMP`, `HIGHLIGHT`, `WASHI_TAPE`, `WIDGET`, `MEDIA`. Figma's API gives no factory method for these from a non-widget plugin (or requires a pre-uploaded image hash). They can still be cloned, moved, deleted, and serialized (they get `stuckTo` exposed) — just not created from scratch.

## Prototype Tools Overview

These tools are **Figma-Design-only** (gated by `requireFigmaDesign()` in the plugin). They operate on the `reactions` array of any reaction-bearing node and the page-level `flowStartingPoints` list.

| Tool | Reads / writes | Notes |
|------|----------------|-------|
| `figma_get_reactions` | `node.reactions` | Works on any node where `'reactions' in node` is true (FRAME, INSTANCE, COMPONENT, etc.) |
| `figma_add_reaction` | `node.setReactionsAsync()` | Appends one reaction `{ trigger, actions: [action] }`; preserves existing reactions; deep-clones via `safeClone` before mutating |
| `figma_remove_reaction` | `node.setReactionsAsync()` | Removes by zero-based index — use `figma_get_reactions` to find it |
| `figma_set_flow_starting_point` | `page.flowStartingPoints` | Page-level, not frame-level (despite the singular tool name). Uses `getPageForNode()` to locate the parent page. |

Trigger and Action schemas mirror Figma's plugin typings — the full enums (12 triggers, 4 action types, navigation/transition/easing) are documented in the README.

## Token Optimization

### Use `figma_search_variables` instead of `figma_get_local_variables`

```javascript
// BAD - Returns 25k+ tokens, may be truncated
figma_get_local_variables({ type: 'ALL' })

// GOOD - Returns ~500 tokens with filtering
figma_search_variables({
  namePattern: 'tailwind/orange/*',  // Wildcard pattern
  type: 'COLOR',
  compact: true,  // Minimal data (id, name, hex only)
  limit: 50
})
```

### Use depth parameter for `figma_get_nodes`

```javascript
// For tree traversal - minimal data (~5 props per node)
figma_get_nodes({ nodeIds: [...], depth: 'minimal' })

// For layout info (~10 props per node)
figma_get_nodes({ nodeIds: [...], depth: 'compact' })

// Only when needed (~40 props per node)
figma_get_nodes({ nodeIds: [...], depth: 'full' })
```

### Node Discovery - IMPORTANT

**ALWAYS use search-first strategy when looking for specific elements:**

1. **`figma_search_nodes`** - Use this FIRST when you know any part of the element's name
   ```javascript
   // DO THIS - Single call to find what you need
   figma_search_nodes({
     parentId: '0:1',           // Page or container ID
     nameContains: 'Button',    // Any part of the name
     types: ['FRAME', 'TEXT'],  // Optional type filter
     compact: true
   })
   ```

2. **`figma_get_children`** - Only use when browsing unknown structure or listing all items at one level

**AVOID** repeatedly calling `figma_get_children` to traverse down a hierarchy looking for a named element. This wastes tokens and API calls.

```
BAD:  get_children -> get_children -> get_children -> get_children (4+ calls)
GOOD: search_nodes with nameContains (1 call)
```

### Other search tools

```javascript
// Find components by name
figma_search_components({ nameContains: 'Header' })

// Find styles by name (more efficient than figma_get_local_styles)
figma_search_styles({ nameContains: 'primary', type: 'PAINT' })
```

## Error Handling

### BridgeError Codes
- `NOT_CONNECTED` - Plugin not connected
- `TIMEOUT` - Command exceeded 30s
- `NODE_NOT_FOUND` - Invalid node ID
- `INVALID_PARAMS` - Missing/invalid parameters
- `OPERATION_FAILED` - Figma API error
- `WRONG_EDITOR` - FigJam-only tool called outside FigJam (message names the tool + current editorType)
- `FIGMA_DESIGN_ONLY` - Figma-Design-only tool called outside a design file
- `READ_ONLY_EDITOR` - Mutation tool called in Dev Mode (`editorType: 'dev'`), where the document is read-only
- `INSTANCE_SUBLAYER_RESTRICTED` - Resize / size-bind attempted on a node inside an INSTANCE
- `BIND_NOT_APPLIED` - `setBoundVariable` reported no error but the bind does not read back
- `UNBIND_FAILED` - Unbind threw, or the field still reads back bound
- `STYLE_NOT_APPLIED` - Async style setter reported no error but the style id does not read back
- `STYLE_SETTER_UNAVAILABLE` - Node exposes the `*StyleId` property but not its required async setter
- `RESIZE_NO_OP` - `resize()` changed nothing and the size still differs from the request
- `LIMIT_NOT_APPLIED` / `LIMIT_NOT_CLEARED` - A min/max size limit did not stick / did not clear
- `FIELD_NOT_SUPPORTED` - Node type does not have the requested field
- `REORDER_FAILED` - The node's index did not read back as the requested final index
- `EXPORT_WRITE_FAILED` - The export succeeded but the image could not be written to disk (path reported)
- `EXPORT_NO_DATA` - Figma returned no image bytes, so nothing was written

### Standard Response Format

```javascript
// Success
{ content: [{ type: 'text', text: JSON.stringify(result) }] }

// Error
{ error: { code: 'ERROR_CODE', message: 'Human readable' }, isError: true }
```

## Key Constraints

1. **No ES6 spread in plugin** - Use explicit property assignment
   ```javascript
   // BAD
   const newObj = { ...oldObj, newProp: value };

   // GOOD
   const newObj = Object.assign({}, oldObj, { newProp: value });
   ```

2. **Async APIs required** - Many Figma APIs need async versions
   - `figma.getNodeByIdAsync()` not `figma.getNodeById()`
   - `figma.getLocalPaintStylesAsync()` not `figma.getLocalPaintStyles()`
   - `figma.variables.getLocalVariablesAsync()`

3. **Font loading for text** - Must load fonts before modifying text
   ```javascript
   await figma.loadFontAsync(textNode.fontName);
   textNode.characters = 'New text';
   ```

4. **Boolean operations require same parent** - Nodes must share a parent

5. **Constraints vs layoutAlign** - Use `layoutAlign` for auto-layout children, `constraints` only for non-auto-layout frames

6. **Lines have height=0** - Use `length` parameter, not width/height

7. **Vectors: No arc commands** - Only M, L, Q, C, Z path commands supported

8. **WebSocket runs in UI iframe** - Plugin UI thread handles WebSocket, main thread handles Figma API

9. **Export is file-first** - `figma_export_node` decodes the plugin's base64 **server side** (`src/tools/mutations.js`) and writes the image to disk, returning `{ path, format, bytes }` with no inline data. Default destination is `os.tmpdir()/figma-mcp-bridge/<node-id>-<timestamp>.<ext>`; `outputPath` (absolute) overrides it, directories are created, and an unwritable path returns `EXPORT_WRITE_FAILED`. `returnBase64: true` is the escape hatch. The plugin side still returns base64 over the socket — don't add file IO to `plugin/code.js`, it has no `fs`

10. **Variable paint binding** - Use `figma.variables.setBoundVariableForPaint()` for fills/strokes

11. **Polygons vs Stars** - `figma.createPolygon()` for polygons, `figma.createStar()` with `innerRadius` (0-1) for stars

12. **`detachInstance()` cascades** - Also detaches ancestor instances, use with caution

13. **Reordering nodes** - `children` is read-only, so order is changed with `appendChild` / `insertChild`. **Never use `insertChild` to move a node that is already a child of the same parent** — Figma does not document whether the index is interpreted before or after the implicit removal, which is what made `figma_reorder_node` land one slot off. `reorderNode` computes the desired final sibling order and re-`appendChild`s the changed suffix (documented as "adds to the end", so no ambiguity), then verifies the index by readback

14. **`mainComponent` is async** - Use `getMainComponentAsync()` for instances (currently skipped in serialization)

## FigJam Constraints

15. **Text on FigJam nodes is a `TextSublayer`, not a child node** - `STICKY`, `SHAPE_WITH_TEXT`, `CONNECTOR`, and `TABLE_CELL` all use `node.text.characters` (not `node.characters`) and `node.text.fontName`. The sublayer is NOT in the scene graph and has no `id`. Use `loadFontForSublayer(node.text)` rather than `figma.loadFontAsync(node.fontName)`.

16. **`textAlignVertical` and `textAutoResize` cannot be set on TextSublayer** - `figma_set_text_style` rejects these on FigJam nodes with a clear error.

17. **`StickyNode` `width`/`height` are readonly** - Don't try to `resize()` a sticky. The `isWideWidth` boolean toggles between square (240×240) and wide variants.

18. **`ShapeWithTextNode.cornerRadius` is readonly** - Set `shapeType: 'ROUNDED_RECTANGLE'` instead. The shape's geometry handles the radius.

19. **Connector magnet rules** - `STRAIGHT` connectors only accept `CENTER` or `NONE` magnets. `ELBOWED`/`CURVED` accept all six (`AUTO`, `TOP`, `LEFT`, `BOTTOM`, `RIGHT`, `CENTER`). The `validateConnectorMagnet(lineType, endpoint)` helper enforces this.

20. **Connectors have no fills, only strokes** - The `serializeNode` fills/strokes/effects/opacity reads were decoupled (each property is checked individually) so connectors get strokes serialized correctly.

21. **`figma.createLinkPreviewAsync()` returns either `EmbedNode` or `LinkUnfurlNode`** - OEmbed-supporting URLs (YouTube, Spotify) → `EMBED`; everything else → `LINK_UNFURL` from OG/Twitter Card metadata. The `figma_create_link_preview` response includes `nodeType` so callers know which.

22. **`devStatus` on `SectionNode` only valid directly under a page or section** - Cannot be set on a section nested inside a node that already has a `devStatus`. The handler swallows the error into a `devStatusError` field on the response rather than failing the create.

23. **`getTopLevelFrame()` throws in FigJam** - Never call it in serialization for FigJam node types. Use `getPageForNode()` instead (already in `plugin/code.js`).

24. **Stamps/Highlights/WashiTape/Widgets cannot be created from plugins** - Only cloned from existing user-placed instances. They serialize their `stuckTo` node ID for inspection.

25. **`editorType` is exposed in `figma_get_context`** - The union has **five** members: `"figma" | "figjam" | "dev" | "slides" | "buzz"`. The `requireFigJam(toolName)` plugin helper guards FigJam-only commands (`WRONG_EDITOR`); `requireFigmaDesign(toolName)` guards the reverse (`FIGMA_DESIGN_ONLY`). Both take an explicit tool name so the error identifies the tool, says it is FigJam-only / Design-only, and reports the current editor via `describeCurrentEditor()`. Never gate on `!== 'figjam'`.

25b. **Dev Mode is supported read-only** - The manifest includes `"dev"` in `editorType` (plus `capabilities: ["inspect"]` so the UI iframe — which hosts the WebSocket, see constraint 8 — renders in the inspect panel). Dev Mode plugins get a read-only document, so `requireWritableEditor(command)` runs at the top of `handleCommand` and throws `READ_ONLY_EDITOR` for anything not in the `DEV_MODE_READ_COMMANDS` whitelist (get/search/export tools plus selection/current-page/viewport, which are not document edits). `get_reactions` is whitelisted so its own `requireFigmaDesign()` guard produces the accurate error. When adding a new read-only command, add it to the whitelist — new commands are treated as writes by default. The UI shows a "read-only" badge in Dev Mode (via the `get_editor_info` → `editor_info` message pair) and the window is widened to 260px to fit it.

26. **`StickyNode.authorName` / `authorVisible` are read-only at runtime** - Figma's docs list them as R/W, but the FigJam plugin runtime throws "no setter for property" on assignment. Figma auto-populates both from the active user's identity. The schemas for `figma_create_sticky` / `figma_set_sticky` deliberately do NOT expose these. Don't add them back unless you've verified the runtime accepts writes.

27. **`CodeBlockNode.code` setter requires Source Code Pro Medium** - `block.code = '...'` throws `Cannot write to node with unloaded font "Source Code Pro Medium"` if the font isn't preloaded. Both `createCodeBlock` and `setCodeBlock` `await figma.loadFontAsync({ family: 'Source Code Pro', style: 'Medium' })` before assigning. Setting `codeLanguage` alone does NOT require font load.

28. **Connectors default to Inter Medium** - Not Inter Regular. The `loadFontForSublayer` helper cascades through Inter Medium → Inter Regular when the sublayer's `fontName` getter doesn't return a usable value. Single fixed font is brittle; the cascade is required.

29. **The plugin's main catch normalizes non-Error throws** - `figma.ui.onmessage` handler in `plugin/code.js:38` converts string/plain-object/null throws into a usable `{ code, message }` shape. Without this, `error.message` would be `undefined` and surface as "Unknown error" on the MCP side. When throwing soft errors from a command handler, attach `.code` to the Error object and a meaningful `.message`.

30. **`figma.createPage()` is Figma Design only** - The FigJam plugin runtime does NOT expose `figma.createPage()` — calling it returns `figma.createPage is not a function`. `PageNode.clone()` is similarly unavailable. Use the `requireFigmaDesign()` helper to gate these. FigJam files DO support multiple pages, but pages must be created from the FigJam UI; plugins cannot create them programmatically. Other page operations (`renamePage`, `deletePage`, `setCurrentPage`, `listPages`) work in both editors.

## Prototype Constraints

31. **Reactions are written via `setReactionsAsync(newArray)`, not via `node.reactions = ...`** - The `reactions` property is readable but writes go through the async setter. Clone existing entries with `safeClone(r)` before pushing/splicing — `node.reactions` returns frozen objects you can't mutate in place. The reaction shape is `{ trigger, actions: [action] }` (the `action` singular field is deprecated; always use the `actions` array).

32. **`PageNode.flowStartingPoints` is typed as `ReadonlyArray` but the runtime accepts assignment** - This is the only documented way to add/remove flow starting points. There is NO `FrameNode.flowStartingPoint` property — flow starting points are page-level. Pattern: read `page.flowStartingPoints`, map to plain `{ nodeId, name }` entries, mutate the array, then assign back to `page.flowStartingPoints`. Each entry is `{ nodeId: string, name: string }` — no scroll offset or other fields are part of the documented shape.

33. **Prototype tools require Figma Design** - All four prototype tools (`get_reactions`, `add_reaction`, `remove_reaction`, `set_flow_starting_point`) call `requireFigmaDesign()` at the top of the plugin handler. `FIGMA_DESIGN_ONLY` is the error code surfaced to the MCP client when called from FigJam.

34. **Directional transitions require `matchLayers`** — `MOVE_IN`, `MOVE_OUT`, `PUSH`, `SLIDE_IN`, `SLIDE_OUT` are `DirectionalTransition` in the typings, which requires both `direction` AND `matchLayers: boolean`. `setReactionsAsync` rejects the reaction at validation time without `matchLayers`, with a misleading error that mentions every union variant. The `buildTransition` helper in `plugin/code.js` sets `matchLayers: false` by default for directional types — exposed as an optional schema param.

35. **Live-tested Figma-runtime constraints surfaced during prototype tool testing:**
- **URL action requires a click-like trigger** — `ON_HOVER` + `URL` is rejected. Use `ON_CLICK` or one of the mouse triggers.
- **`overlayRelativePosition` requires `overlayPosition: MANUAL` on the destination frame** — without that, `setReactionsAsync` rejects the OVERLAY action. Plain OVERLAY navigation (no relative position) works fine.
- **`SCROLL_TO` navigation requires the destination be a scrollable child of the source's container** — pointing it at a separate top-level frame is rejected. Same for `SCROLL_ANIMATE` transitions in unrelated contexts.

## Variable / Style Constraints

36. **`setExplicitVariableModeForCollection` must be passed a collection OBJECT** - The `(collectionId, modeId)` string overload is deprecated and **throws** under `documentAccess: dynamic-page`. Fetch with `await figma.variables.getVariableCollectionByIdAsync(id)` first. Same for `clearExplicitVariableModeForCollection(collection)` — it is a real, separate method, not `setExplicit...(collection, null)`. Both setters are **synchronous**. Available on every scene node **and** on `PageNode`. See `setVariableMode` in `plugin/code.js`.

37. **`figma.variables.setBoundVariableForPaint` returns a COPY** - It does not mutate. You must assign the returned paint back (`style.paints = paints` / `node.fills = paints`) or the bind silently no-ops. Same trap for `setBoundVariableForEffect` and `setBoundVariableForLayoutGrid`.

38. **Style variable binds go through `figma.getStyleByIdAsync`** - `figma_set_variable` accepts a `styleId` (and routes a style ID passed as `nodeId` down the same path). `TextStyle.setBoundVariable(field, variable)` takes a **Variable object only** — the string-ID form does not exist on styles at all. Bindable text fields: `fontFamily`, `fontSize`, `fontStyle`, `fontWeight`, `letterSpacing`, `lineHeight`, `paragraphSpacing`, `paragraphIndent`. `PaintStyle` binds only its color, and reads back under the key `paints` (an array), not `color`.

39. **`strokeWeight` reads as `figma.mixed` when per-side weights differ** - `figma.mixed` is a Symbol, and `safeClone` turns Symbols into `null` — which would read as "no stroke weight". `readStrokeWeight(node)` returns the string `'MIXED'` instead, and the serializer then emits the four per-side weights alongside it. Per-side weights (`IndividualStrokesMixin`) exist on `RECTANGLE` plus the frame-likes (`FRAME`, `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, `SLOT`, `SLIDE`) only.

40. **`style.remove()` only deletes local styles** - It is sync and unrestricted, but the *fetch* must be `figma.getStyleByIdAsync`. `figma_delete_style` returns a `REMOTE_STYLE` error for library styles. Note `style.consumers` throws under dynamic-page — use `getStyleConsumersAsync()` if a consumer check is ever added.

41. **All five `*StyleId` properties are READ-ONLY under dynamic-page** - `node.textStyleId = id` throws `Cannot call with documentAccess: dynamic-page. Use node.setTextStyleIdAsync instead.` `applyStyle` in `plugin/code.js` dispatches through `setFillStyleIdAsync` / `setStrokeStyleIdAsync` / `setTextStyleIdAsync` / `setEffectStyleIdAsync` / `setGridStyleIdAsync` and passes `style.id` (the canonical form — user-supplied ids drop the trailing comma, hence `normalizeStyleId()` for the comparison). Never add a plain `node.someStyleId = ...` assignment. The result is verified by readback and fails with `STYLE_NOT_APPLIED` rather than reporting success. `textStyleId` / `fillStyleId` can read back as `figma.mixed`, so any non-string readback counts as "not applied".

## Anti-silent-failure Constraints

Figma has several writes that report success and change nothing. The rule for this bridge: **no handler returns `success: true` without reading the value back.** Codes below are stable and referenced in tool descriptions.

42. **Instance sublayers reject size overrides silently** - `resize()` and `setBoundVariable('width'|'height', v)` on a node inside an INSTANCE do nothing and report success. `assertNotInstanceSublayer(node, operation, remedy)` throws `INSTANCE_SUBLAYER_RESTRICTED` up front in `resizeNodes` and in the `setVariable` node-bind path. Detection is `findInstanceAncestor(node)` — a `node.parent` walk for `type === 'INSTANCE'`, stopping at PAGE/DOCUMENT. **The `I<instanceId>;<childId>` node-id convention is community lore, documented nowhere in Figma's typings, and is deliberately NOT used.** The suggested remedy in every message is: bind/resize on the component master, or use `figma_set_layout_align: STRETCH` (which works inside instances *and* preserves binds).

43. **Every node variable bind is verified** - After `node.setBoundVariable(field, variable)` the plugin re-reads `node.boundVariables[field]` via `readBoundAlias()` and throws `BIND_NOT_APPLIED` if it is absent or points at a different variable. `readBoundAlias` handles the two readback quirks: node-level text fields come back as `VariableAlias[]`, and a `cornerRadius` bind surfaces on rects/frames as the four per-corner keys. The paint path (`fills`/`strokes`) is verified too, since `setBoundVariableForPaint` returns a copy. Successful binds echo `boundVariables` and `verified: true`.

44. **Resize and layout changes can destroy width/height binds** - Undocumented in *both* directions, so the contract is empirical: capture → write → re-read → re-apply → verify. `captureSizeBinds(node)` snapshots the six size fields (`width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`); `restoreSizeBinds(node, captured)` re-applies anything that went missing and verifies. Recovered binds land in `rebound`; unrecoverable ones become `warnings` via `describeLostBinds()`. Wired into both `resizeNodes` and `setAutoLayout` (where `layoutMode` / `primaryAxisSizingMode` are the risky writes).

45. **`figma_resize_nodes` verifies the resulting size** - `SIZE_EPSILON = 0.01`. Unchanged size + differs from request → `RESIZE_NO_OP` in `errors` and `success: false` (the MCP handler flips that to `isError`). Changed but not to the requested value → a clamp `warning`. Each node echoes `requested` and `actual`.

46. **min/max size limits: `null` clears, and unbinding leaves a literal behind** - `figma_set_size_limits` sets or clears all four, verifying each readback (`LIMIT_NOT_APPLIED` / `LIMIT_NOT_CLEARED`). It warns when the node is neither an auto-layout frame nor a direct child of one, and when the field is variable-bound (the bind beats the literal). `figma_unbind_variable` on a min/max field additionally sets the residual literal to `null` — without that, unbinding `maxWidth` freezes the last resolved number as a permanent clamp — and reports `previousLiteral` / `clearedLiteral`.

47. **`node.rotation` pivots on the TOP-LEFT, not the center** - Documented Figma behavior. `figma_set_rotation` defaults to `pivot: 'center'` and writes `relativeTransform` instead: read the current transform, compute the visual center in parent space, then solve for the translation that keeps it. Matrix is row-major `[[m00,m01,m02],[m10,m11,m12]]` with `rotation === atan2(-m10, m00)`, so a rotation of θ is `[[cos, sin, tx], [-sin, cos, ty]]`. **Auto-layout children are excluded** — the parent computes their translation and discards the compensating one — so those get a plain rotation plus a `warning` naming the parent, never a silent wrong result. The resulting `rotation` is compared to the request (`angleDelta`, ±180-wrap aware) and every node echoes `appliedPivot` and `absoluteBoundingBox`.

## Ergonomics Constraints

48. **`figma_reorder_node`'s `position` is the FINAL index** - Not an insertion index. 0 is the bottom of the layer stack (Figma sorts `children` back-to-front), `childCount - 1` is the top; `'back'` is 0 and `'front'` is the last index. Out-of-range values are clamped, reported via `clamped: true` + `message`, and the achieved index is verified against the request (`REORDER_FAILED`). See constraint 13 for why `insertChild` is not used. Reordering inside an INSTANCE is documented-blocked, so `assertNotInstanceSublayer` runs first — a mid-sequence throw would otherwise leave the parent half-reordered. A `PAGE` parent gets `await parent.loadAsync()` first (dynamic-page requirement for `children`/`appendChild`).

49. **Node ids resolve through `resolveNodeById`, not raw `getNodeByIdAsync`** - `getNodeByIdAsync` is unreliable for the composite instance-sublayer ids Figma hands back from search and selection (`I<instanceId>;<childId>`), which is why `figma_search_nodes` always worked where `figma_get_nodes` did not. The helper tries the direct lookup, and on a null result for an id containing `';'` walks each ancestor prefix (longest first, with and without the leading `I`) and searches that subtree for an exact `node.id` match. Used by `getNodes`, `getChildren` and `reorderNode`. A genuinely missing id is reported through `describeUnresolvedId()` — `notFound` keeps its shape (array of ids) and `notFoundDetails` carries the explanation. **This is id *resolution*, not an instance-sublayer *check*** — the permission check is still `findInstanceAncestor` (constraint 42), never the `;` heuristic.

50. **Compact serialization carries x/y** - `serializeNodeCompact` (used by `figma_get_children` compact and `figma_search_nodes` compact) includes `x`/`y`; `serializeNode(node, 'compact')` already had x/y/width/height. Measuring child positions is how wrap and row grouping get verified, so compact output without them was useless for geometry. Compact deliberately does **not** carry the full-mode fields (`boundVariables`, `explicitVariableModes`, `layoutWrap`, …) — that is what `depth: 'full'` is for.

## Running the Server

```bash
# Default port 3055
node src/index.js

# Custom port
FIGMA_BRIDGE_PORT=3057 node src/index.js
```

The Figma plugin UI has a port input field - change it to match the server port.

## Configuration

### Claude Code MCP Setup
```bash
claude mcp add figma-mcp-bridge node /path/to/src/index.js
```

### Auto-approve tools (`.claude/settings.local.json`)
```json
{
  "permissions": {
    "allow": ["mcp__figma-mcp-bridge__*"]
  }
}
```
