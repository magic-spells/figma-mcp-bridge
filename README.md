# Figma MCP Bridge

A Model Context Protocol (MCP) server that enables Claude to read and manipulate Figma documents in real-time through a WebSocket bridge to a Figma plugin.

## Features

- **44 Figma operations** - Create shapes, modify styles, manage components, export assets
- **Real-time bidirectional communication** - Changes appear instantly in Figma
- **Token-optimized queries** - Efficient variable search and node traversal for AI interactions
- **Full Figma API access** - Styles, variables, auto-layout, boolean operations, and more

## Architecture

```
Claude Code ←──stdio──→ MCP Server ←──WebSocket──→ Figma Plugin ←──→ Figma API
                        (Node.js)    localhost:3055    (runs in Figma)
```

## Quick Start

### Prerequisites
- Node.js 18+
- Figma desktop app
- Claude Code CLI or Claude Desktop

### Installation

#### Option A: Install from npm (recommended)

**For Claude Code CLI:**
```bash
claude mcp add figma-mcp-bridge -- npx @magic-spells/figma-mcp-bridge
```

**For Claude Desktop:**

Edit your config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@magic-spells/figma-mcp-bridge"]
    }
  }
}
```

Then restart Claude Desktop.

**Install the Figma plugin:**
- Download the `plugin` folder from this repo
- In Figma: **Plugins → Development → Import plugin from manifest**
- Select `plugin/manifest.json`

**Connect:**
- Open a Figma file
- Run the plugin: **Plugins → Development → Claude Figma Bridge**
- The status should show "Connected"

#### Option B: Install from source

1. **Clone the repository**
   ```bash
   git clone https://github.com/magic-spells/figma-mcp-bridge.git
   cd figma-mcp-bridge
   npm install
   ```

2. **Add to Claude Code**
   ```bash
   claude mcp add figma-mcp-bridge node /path/to/figma-mcp-bridge/src/index.js
   ```

3. **Install the Figma plugin**
   - In Figma: **Plugins → Development → Import plugin from manifest**
   - Select `plugin/manifest.json` from the cloned repo

4. **Connect**
   - Open a Figma file
   - Run the plugin: **Plugins → Development → Claude Figma Bridge**
   - The status should show "Connected"

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FIGMA_BRIDGE_PORT` | `3055` | WebSocket server port (auto-increments if busy) |

### Auto-approve Figma Tools

Add to `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": ["mcp__figma-mcp-bridge__*"]
  }
}
```

---

## Commands Reference

### Query Commands

#### `figma_get_context`
Get the current Figma document context including file info, current page, and selection.

| Parameter | Type | Description |
|-----------|------|-------------|
| *(none)* | | |

#### `figma_list_pages`
List all pages in the current Figma document.

| Parameter | Type | Description |
|-----------|------|-------------|
| *(none)* | | |

#### `figma_get_nodes`
Get detailed information about specific nodes by their IDs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Array of node IDs (e.g., `["1:23", "4:56"]`) |
| `depth` | string | No | Detail level: `minimal`, `compact`, or `full` (default) |

#### `figma_get_local_styles`
List all local styles defined in the document.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter: `PAINT`, `TEXT`, `EFFECT`, `GRID`, or `ALL` (default) |

#### `figma_get_local_variables`
Get all local variables and variable collections.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter: `COLOR`, `FLOAT`, `STRING`, `BOOLEAN`, or `ALL` (default) |

> **Note**: Can return 25k+ tokens. Prefer `figma_search_variables` for efficiency.

#### `figma_get_children`
Get immediate children of a node. Efficient for browsing hierarchy one level at a time.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `parentId` | string | Yes | | Node ID to get children of |
| `compact` | boolean | No | `true` | Return minimal data |

#### `figma_search_nodes`
Search for nodes by name within a scope. **Preferred for finding specific frames, sections, or elements.**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `parentId` | string | Yes | | Scope to search (page/frame/section ID) |
| `nameContains` | string | No | | Case-insensitive substring match |
| `namePattern` | string | No | | Glob pattern with wildcards (e.g., `*button*`) |
| `types` | string[] | No | | Filter by node types: `FRAME`, `TEXT`, `SECTION`, `COMPONENT`, `INSTANCE`, `GROUP`, etc. |
| `maxDepth` | number | No | `-1` | Search depth (-1 = unlimited, 1 = immediate children) |
| `compact` | boolean | No | `true` | Return minimal data |
| `limit` | number | No | `50` | Maximum results |

> Returns ~50 tokens/node vs ~500 for full node data.

#### `figma_search_components`
Search local components by name. Use when looking for specific components like "Button", "Header", etc.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nameContains` | string | No | | Case-insensitive substring match |
| `namePattern` | string | No | | Glob pattern with wildcards |
| `includeVariants` | boolean | No | `false` | Include individual variants from component sets |
| `compact` | boolean | No | `true` | Return minimal data |
| `limit` | number | No | `50` | Maximum results |

#### `figma_search_styles`
Search local styles by name. More efficient than `figma_get_local_styles` when looking for specific styles.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nameContains` | string | No | | Case-insensitive substring match |
| `type` | string | No | `"ALL"` | Filter: `PAINT`, `TEXT`, `EFFECT`, `GRID`, `ALL` |
| `compact` | boolean | No | `true` | Return minimal data |
| `limit` | number | No | `50` | Maximum results |

---

### Creation Commands

#### `figma_create_rectangle`
Create a new rectangle.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | `100` | Width in pixels |
| `height` | number | No | `100` | Height in pixels |
| `name` | string | No | `"Rectangle"` | Node name |
| `fills` | color | No | | Fill color |
| `parentId` | string | No | | Parent node ID |

#### `figma_create_ellipse`
Create an ellipse, circle, arc, or ring.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | `100` | Width (diameter for circle) |
| `height` | number | No | `100` | Height |
| `name` | string | No | `"Ellipse"` | Node name |
| `fills` | color | No | | Fill color |
| `parentId` | string | No | | Parent node ID |
| `arcData.startingAngle` | number | No | | Starting angle in radians |
| `arcData.endingAngle` | number | No | | Ending angle in radians |
| `arcData.innerRadius` | number | No | | Inner radius ratio (0-1) for rings |

#### `figma_create_polygon`
Create a polygon or star shape.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | `100` | Width |
| `height` | number | No | `100` | Height |
| `pointCount` | number | No | `5` | Number of sides/points (min 3) |
| `innerRadius` | number | No | | Inner radius ratio for stars (0-1) |
| `cornerRadius` | number | No | | Corner radius for vertices |
| `name` | string | No | | Node name |
| `fills` | color | No | | Fill color |
| `strokes` | color | No | | Stroke color |
| `strokeWeight` | number | No | | Stroke weight |
| `parentId` | string | No | | Parent node ID |

#### `figma_create_line`
Create a line.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `length` | number | No | `100` | Line length |
| `rotation` | number | No | `0` | Rotation in degrees |
| `strokeWeight` | number | No | `1` | Stroke weight |
| `strokes` | color | No | | Stroke color |
| `strokeCap` | string | No | `"NONE"` | Cap: `NONE`, `ROUND`, `SQUARE`, `ARROW_LINES`, `ARROW_EQUILATERAL` |
| `name` | string | No | `"Line"` | Node name |
| `parentId` | string | No | | Parent node ID |

#### `figma_create_vector`
Create a custom vector shape using SVG path data.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `data` | string | Yes | | SVG path (e.g., `"M 0 100 L 100 100 L 50 0 Z"`) |
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `windingRule` | string | No | `"NONZERO"` | Fill rule: `NONZERO`, `EVENODD`, `NONE` |
| `name` | string | No | `"Vector"` | Node name |
| `fills` | color | No | | Fill color |
| `strokes` | color | No | | Stroke color |
| `strokeWeight` | number | No | | Stroke weight |
| `parentId` | string | No | | Parent node ID |

> Supports M (move), L (line), Q (quadratic), C (cubic bezier), Z (close). No arcs.

#### `figma_create_frame`
Create a frame container (supports auto-layout).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | `100` | Width |
| `height` | number | No | `100` | Height |
| `name` | string | No | `"Frame"` | Node name |
| `fills` | color | No | | Fill color |
| `parentId` | string | No | | Parent node ID |

#### `figma_create_text`
Create a text node.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `text` | string | No | `"Text"` | Text content |
| `fontSize` | number | No | `16` | Font size |
| `fontFamily` | string | No | `"Inter"` | Font family |
| `fontStyle` | string | No | `"Regular"` | Font style |
| `fills` | color | No | | Text color |
| `name` | string | No | `"Text"` | Node name |
| `parentId` | string | No | | Parent node ID |

#### `figma_clone_nodes`
Clone (duplicate) nodes.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeIds` | string[] | Yes | | Node IDs to clone |
| `parentId` | string | No | | Parent for clones |
| `offset.x` | number | No | `20` | X offset from original |
| `offset.y` | number | No | `20` | Y offset from original |

#### `figma_create_component`
Create a reusable component.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `fromNodeId` | string | No | | Convert existing node to component |
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | `100` | Width |
| `height` | number | No | `100` | Height |
| `name` | string | No | `"Component"` | Component name |
| `fills` | color | No | | Fill color |
| `parentId` | string | No | | Parent node ID |
| `description` | string | No | | Component description |

#### `figma_create_instance`
Create an instance of a component.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `componentId` | string | Yes | Component ID to instantiate |
| `x` | number | No | X position |
| `y` | number | No | Y position |
| `parentId` | string | No | Parent node ID |
| `name` | string | No | Instance name |

---

### Style Commands

#### `figma_set_fills`
Set fill color on a node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to modify |
| `fills` | color | Yes | Fill color |

**Color formats:**
- Hex: `{ color: "#FF0000" }` or `{ color: "#FF0000AA" }` (with alpha)
- RGB: `{ r: 1, g: 0, b: 0, a: 0.5 }`
- Full array: `[{ type: "SOLID", color: { r, g, b }, opacity: 1 }]`

#### `figma_set_strokes`
Set stroke color on a node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to modify |
| `strokes` | color | Yes | Stroke color |
| `strokeWeight` | number | No | Stroke weight in pixels |

#### `figma_set_text`
Set text content on a text node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Text node to modify |
| `text` | string | Yes | New text content |

#### `figma_set_opacity`
Set node transparency.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to modify |
| `opacity` | number | Yes | Opacity (0-1) |

#### `figma_set_corner_radius`
Set corner radius.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to modify |
| `radius` | number | No | Uniform radius for all corners |
| `topLeft` | number | No | Top-left corner radius |
| `topRight` | number | No | Top-right corner radius |
| `bottomLeft` | number | No | Bottom-left corner radius |
| `bottomRight` | number | No | Bottom-right corner radius |

#### `figma_set_effects`
Set effects (shadows, blurs).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to modify |
| `effects` | array | Yes | Array of effect objects |

**Shadow effect:**
```json
{
  "type": "DROP_SHADOW",
  "color": { "color": "#000000" },
  "offset": { "x": 0, "y": 4 },
  "radius": 8,
  "spread": 0,
  "visible": true
}
```

**Blur effect:**
```json
{
  "type": "LAYER_BLUR",
  "radius": 10,
  "visible": true
}
```

#### `figma_set_blend_mode`
Set layer blend mode.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to modify |
| `blendMode` | string | Yes | Blend mode |

**Blend modes:** `PASS_THROUGH`, `NORMAL`, `DARKEN`, `MULTIPLY`, `LINEAR_BURN`, `COLOR_BURN`, `LIGHTEN`, `SCREEN`, `LINEAR_DODGE`, `COLOR_DODGE`, `OVERLAY`, `SOFT_LIGHT`, `HARD_LIGHT`, `DIFFERENCE`, `EXCLUSION`, `HUE`, `SATURATION`, `COLOR`, `LUMINOSITY`

#### `figma_apply_style`
Apply a local style to a node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to apply style to |
| `styleId` | string | Yes | Style ID |
| `property` | string | Yes | Property: `fills`, `strokes`, `text`, `effects`, `grid` |

#### `figma_set_variable`
Set variable value or bind to node property.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `variableId` | string | Yes | Variable ID |
| `modeId` | string | No | Mode ID (for setting value) |
| `value` | any | No | Value to set |
| `nodeId` | string | No | Node ID (for binding) |
| `field` | string | No | Field to bind (`opacity`, `cornerRadius`, `fills`, etc.) |
| `paintIndex` | number | No | Paint array index for fills/strokes (default 0) |

---

### Layout Commands

#### `figma_set_auto_layout`
Configure auto-layout on a frame.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Frame to configure |
| `layoutMode` | string | No | `NONE`, `HORIZONTAL`, `VERTICAL` |
| `primaryAxisSizingMode` | string | No | `FIXED`, `AUTO` |
| `counterAxisSizingMode` | string | No | `FIXED`, `AUTO` |
| `primaryAxisAlignItems` | string | No | `MIN`, `CENTER`, `MAX`, `SPACE_BETWEEN` |
| `counterAxisAlignItems` | string | No | `MIN`, `CENTER`, `MAX`, `BASELINE` |
| `paddingTop` | number | No | Top padding |
| `paddingRight` | number | No | Right padding |
| `paddingBottom` | number | No | Bottom padding |
| `paddingLeft` | number | No | Left padding |
| `itemSpacing` | number | No | Space between items |
| `counterAxisSpacing` | number | No | Space between rows when wrapped |
| `layoutWrap` | string | No | `NO_WRAP`, `WRAP` |

#### `figma_set_layout_align`
Set child alignment in auto-layout.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Child node to modify |
| `layoutAlign` | string | No | `MIN`, `CENTER`, `MAX`, `STRETCH`, `INHERIT` |
| `layoutGrow` | number | No | Growth factor (0-1) |
| `layoutPositioning` | string | No | `AUTO`, `ABSOLUTE` |

---

### Transform Commands

#### `figma_move_nodes`
Move nodes to a new position.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to move |
| `x` | number | No | X position or offset |
| `y` | number | No | Y position or offset |
| `relative` | boolean | No | If true, x/y are offsets (default false) |

#### `figma_resize_nodes`
Resize nodes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to resize |
| `width` | number | No | New width |
| `height` | number | No | New height |

#### `figma_delete_nodes`
Delete nodes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to delete |

#### `figma_group_nodes`
Group multiple nodes.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeIds` | string[] | Yes | | Nodes to group |
| `name` | string | No | `"Group"` | Group name |

#### `figma_ungroup_nodes`
Ungroup group nodes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Group nodes to ungroup |

#### `figma_rename_node`
Rename nodes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | No | Single node ID |
| `nodeIds` | string[] | No | Batch node IDs |
| `name` | string | Yes | New name |

#### `figma_reorder_node`
Change z-order (layer order).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to reorder |
| `position` | string/number | Yes | `"front"`, `"back"`, or index number |

#### `figma_set_constraints`
Set resize constraints (non-auto-layout frames only).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to configure |
| `horizontal` | string | No | `MIN`, `CENTER`, `MAX`, `STRETCH`, `SCALE` |
| `vertical` | string | No | `MIN`, `CENTER`, `MAX`, `STRETCH`, `SCALE` |

#### `figma_boolean_operation`
Combine shapes using boolean operations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | string | Yes | `UNION`, `SUBTRACT`, `INTERSECT`, `EXCLUDE`, `FLATTEN` |
| `nodeIds` | string[] | Yes | Nodes to combine (min 2) |
| `name` | string | No | Result node name |

---

### Navigation Commands

#### `figma_set_selection`
Set the current selection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to select (empty to clear) |

#### `figma_set_current_page`
Switch to a different page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | Yes | Page ID to switch to |

#### `figma_zoom_to_node`
Zoom viewport to focus on nodes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to zoom to |

---

### Export Commands

#### `figma_export_node`
Export a node as an image.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeId` | string | Yes | | Node to export |
| `format` | string | No | `"PNG"` | Format: `PNG`, `SVG`, `JPG`, `PDF` |
| `scale` | number | No | `1` | Export scale (1 = 100%) |

Returns base64-encoded data.

---

### Component Commands

#### `figma_detach_instance`
Detach instance from component (converts to frame).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Instance to detach |

---

## Token Optimization

### Variable Queries

Use `figma_search_variables` instead of `figma_get_local_variables`:

```javascript
// Inefficient (~25k+ tokens)
figma_get_local_variables({ type: 'ALL' })

// Efficient (~500 tokens)
figma_search_variables({
  namePattern: 'tailwind/orange/*',
  type: 'COLOR',
  compact: true,
  limit: 50
})
```

**`figma_search_variables` parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `namePattern` | string | | Wildcard pattern (`*` = any chars) |
| `type` | string | `"ALL"` | Variable type filter |
| `collectionName` | string | | Collection name filter |
| `compact` | boolean | `true` | Minimal data (id, name, value only) |
| `limit` | number | `50` | Max results |

### Node Traversal

Use the `depth` parameter in `figma_get_nodes`:

| Depth | Properties | Use Case |
|-------|------------|----------|
| `minimal` | ~5 | Tree traversal, finding nodes |
| `compact` | ~10 | Layout inspection |
| `full` | ~40 | Detailed node editing |

### Finding Nodes

Use search tools instead of traversing the full tree:

```javascript
// Find nodes by name within a page/frame
figma_search_nodes({
  parentId: '1:2',           // Required scope
  nameContains: 'button',    // Case-insensitive
  types: ['FRAME', 'COMPONENT'],
  compact: true
})

// Browse hierarchy one level at a time
figma_get_children({ parentId: '1:2' })

// Find components by name
figma_search_components({ nameContains: 'Header' })

// Find styles by name
figma_search_styles({ nameContains: 'primary', type: 'PAINT' })
```

| Tool | Use Case | Token Efficiency |
|------|----------|------------------|
| `figma_search_nodes` | Find frames/elements by name | ~50 tokens/node |
| `figma_get_children` | Browse hierarchy level-by-level | ~50 tokens/node |
| `figma_search_components` | Find specific components | ~50 tokens/result |
| `figma_search_styles` | Find specific styles | ~30 tokens/result |

---

## Known Limitations

- **No ES6 spread operator** in plugin code
- **Boolean operations** require nodes with same parent
- **Constraints** don't work on auto-layout children (use `layoutAlign`)
- **Lines** have height=0, use `length` parameter
- **Vectors** only support M, L, Q, C, Z commands (no arcs)
- **`detachInstance()`** also detaches ancestor instances
- **30-second timeout** on all commands

---

## Troubleshooting

### Plugin Not Connecting

1. Ensure the MCP server is running
2. Check the port: default is 3055, or set `FIGMA_BRIDGE_PORT`
3. Restart the plugin in Figma
4. Click "Reconnect" in the plugin UI

### Port Already in Use

The server automatically tries ports 3055-3060. To use a specific port:
```bash
FIGMA_BRIDGE_PORT=3057 node src/index.js
```

### Multiple Claude Code Instances

Each Claude Code instance can work with a different Figma file by using different ports:

1. **First instance:** Use default port 3055
2. **Second instance:** Set `FIGMA_BRIDGE_PORT=3056`
3. **In Figma plugin:** Change the port number in the plugin UI to match

The plugin UI has a port input field - just change it to connect to a different MCP server.

### Commands Timing Out

- Commands have a 30-second timeout
- Large exports may timeout; try smaller scales
- Check plugin is still connected (green status)

### Font Errors

Text operations require font loading. The plugin handles this automatically, but if a font isn't installed, it will fail. Use fonts available on your system.

---

## License

MIT
