# Figma MCP Bridge - Developer Guide

MCP server enabling Claude to read and manipulate **Figma design files AND FigJam files** via WebSocket bridge to a Figma plugin. Supports flowcharts, diagrams, sticky notes, tables, code blocks, and link previews in FigJam alongside the full Figma design toolset.

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
    ├── index.js       # Tool registration with Zod schemas (84 tools — 63 Figma + 21 FigJam)
    ├── context.js     # figma_get_context handler
    ├── pages.js       # figma_list_pages handler
    ├── nodes.js       # figma_get_nodes handler
    └── mutations.js   # All mutation handlers (Figma + FigJam)

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

For commands that only make sense in FigJam (sticky notes, shapes-with-text, connectors, tables, code blocks, link previews), use the `requireFigJam()` guard at the top of the plugin handler:

```javascript
async function createSticky(params) {
  requireFigJam();  // throws WRONG_EDITOR if running in a Figma design file
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

## FigJam Tools Overview

| Tool | Creates / modifies | Notes |
|------|--------------------|-------|
| `figma_create_sticky` | `STICKY` | Width/height fixed; `text` is sublayer |
| `figma_set_sticky` | `STICKY` | author/wide-width meta only |
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

9. **Export returns base64** - `figma_export_node` returns base64-encoded image data

10. **Variable paint binding** - Use `figma.variables.setBoundVariableForPaint()` for fills/strokes

11. **Polygons vs Stars** - `figma.createPolygon()` for polygons, `figma.createStar()` with `innerRadius` (0-1) for stars

12. **`detachInstance()` cascades** - Also detaches ancestor instances, use with caution

13. **Reordering nodes** - Use `parent.appendChild(node)` for front, `parent.insertChild(0, node)` for back (children array is read-only)

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

25. **`editorType` is exposed in `figma_get_context`** - Returns `"figma"` or `"figjam"`. The `requireFigJam()` plugin helper guards FigJam-only commands; `WRONG_EDITOR` is the standard error code.

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
