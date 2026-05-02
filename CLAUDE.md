# Figma MCP Bridge - Developer Guide

MCP server enabling Claude to read and manipulate Figma documents via WebSocket bridge to a Figma plugin.

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
    ├── index.js       # Tool registration with Zod schemas (63 tools)
    ├── context.js     # figma_get_context handler
    ├── pages.js       # figma_list_pages handler
    ├── nodes.js       # figma_get_nodes handler
    └── mutations.js   # All mutation handlers (~60 functions)

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
