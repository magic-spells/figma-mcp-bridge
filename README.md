# Figma MCP Bridge

A Model Context Protocol (MCP) server that enables Claude to read and manipulate **Figma design files and FigJam files** in real-time through a WebSocket bridge to a Figma plugin.

## Features

- **84 operations** - 63 Figma design tools + 21 FigJam tools (sticky notes, flowchart shapes, connectors, tables, code blocks, link previews)
- **Works in both editors** - Auto-detects whether you're in a Figma design file or FigJam, and gates FigJam-only commands accordingly
- **Real-time bidirectional communication** - Changes appear instantly in Figma/FigJam
- **Token-optimized queries** - Efficient variable search and node traversal for AI interactions
- **Full Figma API access** - Styles, variables, auto-layout, boolean operations, plus FigJam diagrams and documentation

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

#### `figma_server_info`
Get information about the MCP server: package version, WebSocket port, connection state, and connected document info. Useful for confirming which version of the server is running after a code change or upgrade.

| Parameter | Type | Description |
|-----------|------|-------------|
| *(none)* | | |

**Returns:** `{ version, port, connected, documentInfo }`

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

#### `figma_set_text_style`
Set text font properties on an existing text node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Text node ID |
| `fontSize` | number | No | Font size in pixels |
| `fontFamily` | string | No | Font family (e.g., "Inter") |
| `fontStyle` | string | No | Font style (e.g., "Bold", "Regular") |
| `textCase` | string | No | `ORIGINAL`, `UPPER`, `LOWER`, `TITLE` |
| `textDecoration` | string | No | `NONE`, `UNDERLINE`, `STRIKETHROUGH` |
| `lineHeight` | object | No | `{ unit: "AUTO" }` or `{ unit: "PIXELS", value: 24 }` |
| `letterSpacing` | object | No | `{ unit: "PIXELS", value: 1 }` or `{ unit: "PERCENT", value: 5 }` |
| `textAlignHorizontal` | string | No | `LEFT`, `CENTER`, `RIGHT`, `JUSTIFIED` |
| `textAlignVertical` | string | No | `TOP`, `CENTER`, `BOTTOM` |

#### `figma_create_paint_style`
Create a local paint (color) style.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Style name (use `/` for folders, e.g., "Brand/Primary") |
| `fills` | color | Yes | Fill color |
| `description` | string | No | Style description |

#### `figma_create_text_style`
Create a local text style.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | | Style name (use `/` for folders) |
| `fontFamily` | string | No | `"Inter"` | Font family |
| `fontStyle` | string | No | `"Regular"` | Font style |
| `fontSize` | number | No | `16` | Font size in pixels |
| `lineHeight` | object | No | | Line height |
| `letterSpacing` | object | No | | Letter spacing |
| `textCase` | string | No | | Text case transformation |
| `textDecoration` | string | No | | Text decoration |
| `description` | string | No | | Style description |

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

#### `figma_swap_instance`
Swap a component instance to use a different component.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instanceId` | string | Yes | Instance node ID to swap |
| `newComponentId` | string | Yes | Component ID to swap to |

#### `figma_combine_as_variants`
Combine multiple components into a component set with variants.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `componentIds` | string[] | Yes | Array of component IDs (minimum 2). Components must use variant naming (e.g., "Size=Large") |

---

### Variable Management Commands

#### `figma_create_variable_collection`
Create a new variable collection to organize variables.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Collection name |
| `modes` | string[] | No | Mode names (defaults to `["Mode 1"]`) |

#### `figma_create_variable`
Create a new variable in a collection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collectionId` | string | Yes | Variable collection ID |
| `name` | string | Yes | Variable name (use `/` for groups, e.g., "colors/primary") |
| `type` | string | Yes | `COLOR`, `FLOAT`, `STRING`, or `BOOLEAN` |
| `value` | any | No | Initial value for default mode |
| `aliasOf` | string | No | Variable ID to alias (instead of direct value) |
| `description` | string | No | Variable description |
| `scopes` | string[] | No | Where this variable can be used |

#### `figma_rename_variable`
Rename an existing variable.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `variableId` | string | Yes | Variable ID to rename |
| `name` | string | Yes | New name (use `/` for groups) |

#### `figma_delete_variables`
Delete one or more variables.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `variableIds` | string[] | Yes | Array of variable IDs to delete |

#### `figma_rename_variable_collection`
Rename a variable collection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collectionId` | string | Yes | Collection ID to rename |
| `name` | string | Yes | New name |

#### `figma_delete_variable_collection`
Delete a variable collection and all its variables.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collectionId` | string | Yes | Collection ID to delete |

#### `figma_add_mode`
Add a new mode to a variable collection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collectionId` | string | Yes | Collection ID to add mode to |
| `name` | string | Yes | Name for the new mode |

#### `figma_rename_mode`
Rename a mode in a variable collection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collectionId` | string | Yes | Collection ID containing the mode |
| `modeId` | string | Yes | Mode ID to rename |
| `name` | string | Yes | New name for the mode |

#### `figma_delete_mode`
Delete a mode from a variable collection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collectionId` | string | Yes | Collection ID containing the mode |
| `modeId` | string | Yes | Mode ID to delete |

#### `figma_unbind_variable`
Remove a variable binding from a node property.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeId` | string | Yes | | Node ID to unbind from |
| `field` | string | Yes | | Field to unbind (`fills`, `strokes`, `opacity`, etc.) |
| `paintIndex` | number | No | `0` | Paint array index for fills/strokes |

---

### Page Management Commands

> **FigJam restriction:** `figma_create_page` and `figma_duplicate_page` are **Figma Design only**. The FigJam plugin runtime does not expose `figma.createPage()` or `PageNode.clone()`. FigJam files can have multiple pages, but they must be created via the FigJam UI — plugins cannot create them programmatically. Calling these tools in FigJam returns `FIGMA_DESIGN_ONLY`. Other page operations (rename, delete, list, switch current page) work in both editors.

#### `figma_create_page`
Create a new page in the document. **Figma Design only.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Name for the new page |
| `index` | number | No | Position in the page list (0 = first). Defaults to end. |

#### `figma_rename_page`
Rename an existing page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | Yes | Page ID to rename |
| `name` | string | Yes | New name for the page |

#### `figma_delete_page`
Delete a page from the document.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | Yes | Page ID to delete |

> **Note**: Cannot delete the last remaining page.

#### `figma_duplicate_page`
Clone an entire page including all its contents. **Figma Design only.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | Yes | Page ID to duplicate |
| `name` | string | No | Name for the new page (defaults to "original name + copy") |

---

### FigJam Commands

These tools target FigJam-only node types (sticky notes, flowchart shapes, connectors, tables, code blocks, link previews). They return `WRONG_EDITOR` if called against a Figma design file. **Sections (`figma_create_section` / `figma_set_section`) are the exception — they work in both editors.**

#### `figma_create_sticky`
Create a sticky note. Default size is fixed (240×240); width/height are not configurable. Text is set via the embedded sublayer (font auto-loaded).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `text` | string | No | | Sticky note body text |
| `fills` | color | No | | Background color of the sticky |
| `isWideWidth` | boolean | No | | Use the wide rectangular sticky variant |
| `parentId` | string | No | | Parent node ID (defaults to current page) |

> **Author info is read-only at runtime.** Figma's plugin docs list `authorName` and `authorVisible` as R/W on `StickyNode`, but the FigJam runtime rejects writes with "no setter for property". Figma auto-populates both from the active user's identity, so the labeling works correctly without programmatic control.

#### `figma_set_sticky`
Toggle a sticky between square and wide-rectangle variants. Use `figma_set_text` to change the body text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `STICKY` node ID |
| `isWideWidth` | boolean | No | Wide vs square sticky |

#### `figma_create_shape_with_text`
Create a flowchart shape with embedded text. Use `ROUNDED_RECTANGLE` for processes, `DIAMOND` for decisions, `ENG_DATABASE` for data stores. `cornerRadius` is fixed by `shapeType` and cannot be set.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | `208` | Width in pixels |
| `height` | number | No | `208` | Height in pixels |
| `shapeType` | string | Yes | | See list below |
| `text` | string | No | | Embedded text content |
| `fills` | color | No | | Shape fill color |
| `strokes` | color | No | | Shape stroke color |
| `strokeWeight` | number | No | | Stroke weight in pixels |
| `parentId` | string | No | | Parent node ID |

**Shape types (30 values):** `SQUARE`, `ELLIPSE`, `ROUNDED_RECTANGLE`, `DIAMOND`, `TRIANGLE_UP`, `TRIANGLE_DOWN`, `PARALLELOGRAM_RIGHT`, `PARALLELOGRAM_LEFT`, `ENG_DATABASE`, `ENG_QUEUE`, `ENG_FILE`, `ENG_FOLDER`, `TRAPEZOID`, `PREDEFINED_PROCESS`, `SHIELD`, `DOCUMENT_SINGLE`, `DOCUMENT_MULTIPLE`, `MANUAL_INPUT`, `HEXAGON`, `CHEVRON`, `PENTAGON`, `OCTAGON`, `STAR`, `PLUS`, `ARROW_LEFT`, `ARROW_RIGHT`, `SUMMING_JUNCTION`, `OR`, `SPEECH_BUBBLE`, `INTERNAL_STORAGE`.

#### `figma_set_shape_type`
Change the shape variant of an existing shape-with-text node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `SHAPE_WITH_TEXT` node ID |
| `shapeType` | string | Yes | New shape type (see list above) |

#### `figma_create_connector`
Create an arrow / connector between nodes. Default `endCap` is `ARROW_EQUILATERAL` so connectors look like arrows without configuration. Endpoints can attach via magnets, fixed positions on a node, or be free-floating on the canvas.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start` | endpoint | No | | Start endpoint (see endpoint shape below) |
| `end` | endpoint | No | | End endpoint |
| `lineType` | string | No | `"ELBOWED"` | `ELBOWED`, `STRAIGHT`, or `CURVED` |
| `startCap` | string | No | `"NONE"` | Decoration at start |
| `endCap` | string | No | `"ARROW_EQUILATERAL"` | Decoration at end |
| `text` | string | No | | Center label text |
| `strokes` | color | No | | Line color |
| `strokeWeight` | number | No | | Line thickness |
| `parentId` | string | No | | Parent node ID |

**Endpoint shapes** (one of):
- `{ nodeId, magnet }` — attach to a node with a magnet (`AUTO`, `TOP`, `LEFT`, `BOTTOM`, `RIGHT`, `CENTER`, `NONE`)
- `{ nodeId, position: { x, y } }` — attach to a node at a fixed position relative to it
- `{ position: { x, y } }` — free-floating on canvas at absolute coordinates

**Stroke caps:** `NONE`, `ARROW_EQUILATERAL`, `ARROW_LINES`, `TRIANGLE_FILLED`, `CIRCLE_FILLED`, `DIAMOND_FILLED`.

> **Magnet rule:** `STRAIGHT` connectors only support `CENTER` or `NONE` magnets. `ELBOWED` and `CURVED` accept all six. Validation runs server-side.

#### `figma_set_connector`
Modify an existing connector's endpoints, line type, end caps, or label.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `CONNECTOR` node ID |
| `start` | endpoint | No | Replacement start endpoint |
| `end` | endpoint | No | Replacement end endpoint |
| `lineType` | string | No | New line routing type |
| `startCap` | string | No | New start decoration |
| `endCap` | string | No | New end decoration |
| `text` | string | No | Replacement label text |

#### `figma_create_section`
Create a labeled section. **Works in both Figma design files and FigJam.** Supports Dev Mode handoff status.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | `600` | Width in pixels |
| `height` | number | No | `400` | Height in pixels |
| `name` | string | No | | Section label |
| `fills` | color | No | | Section background fill |
| `sectionContentsHidden` | boolean | No | | Visually collapse the section's contents |
| `devStatus` | string | No | | `READY_FOR_DEV` or `COMPLETED` (only valid directly under a page or another section) |
| `devStatusDescription` | string | No | | Optional description shown with the dev status |
| `parentId` | string | No | | Parent node ID |

#### `figma_set_section`
Update a section's name, dev status, or content visibility. Pass `devStatus: null` to clear it.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `SECTION` node ID |
| `name` | string | No | New section label |
| `sectionContentsHidden` | boolean | No | Show or hide section contents |
| `devStatus` | string\|null | No | `READY_FOR_DEV`, `COMPLETED`, or `null` |
| `devStatusDescription` | string | No | Description shown with dev status |

#### `figma_create_table`
Create a table for documentation or structured data. Optionally seed initial cell content.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `numRows` | number | No | `2` | Number of rows |
| `numColumns` | number | No | `2` | Number of columns |
| `cells` | array | No | | Initial cells: `[{ row, column, text?, fills? }]` |
| `fills` | color | No | | Table background fill |
| `parentId` | string | No | | Parent node ID |

#### `figma_set_table_cell`
Set the text and/or fill color of a single table cell.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `TABLE` node ID |
| `row` | number | Yes | Row index (0-based) |
| `column` | number | Yes | Column index (0-based) |
| `text` | string | No | New cell text |
| `fills` | color | No | New cell background fill |

#### `figma_insert_table_row` / `figma_insert_table_column`
Insert a row/column at the given index (existing rows/columns at and after the index shift).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `TABLE` node ID |
| `rowIndex` / `columnIndex` | number | Yes | Insert position (0 = top/leftmost) |

#### `figma_remove_table_row` / `figma_remove_table_column`
Remove a row/column.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `TABLE` node ID |
| `rowIndex` / `columnIndex` | number | Yes | Index to remove |

#### `figma_resize_table_row` / `figma_resize_table_column`
Set row height / column width.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `TABLE` node ID |
| `rowIndex` / `columnIndex` | number | Yes | Target index |
| `height` (row) / `width` (column) | number | Yes | New dimension in pixels |

#### `figma_move_table_row` / `figma_move_table_column`
Reorder rows/columns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `TABLE` node ID |
| `fromIndex` | number | Yes | Source index |
| `toIndex` | number | Yes | Destination index |

#### `figma_create_code_block`
Create a syntax-highlighted code block for documentation.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `code` | string | Yes | | Code text content |
| `codeLanguage` | string | No | `"PLAINTEXT"` | Syntax highlighting language |
| `parentId` | string | No | | Parent node ID |

**Languages (17 values):** `TYPESCRIPT`, `CPP`, `RUBY`, `CSS`, `JAVASCRIPT`, `HTML`, `JSON`, `GRAPHQL`, `PYTHON`, `GO`, `SQL`, `SWIFT`, `KOTLIN`, `RUST`, `BASH`, `PLAINTEXT`, `DART`.

#### `figma_set_code_block`
Update an existing code block's code text or language.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | The `CODE_BLOCK` node ID |
| `code` | string | No | New code text |
| `codeLanguage` | string | No | New syntax-highlighting language |

#### `figma_create_link_preview`
Create a rich link preview from a URL. Returns either an `EMBED` (iframe; works for OEmbed providers like YouTube/Spotify) or a `LINK_UNFURL` (rich card from OpenGraph/Twitter Card metadata) — the response includes `nodeType` so callers know which.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `url` | string | Yes | | The URL to preview |
| `parentId` | string | No | | Parent node ID |

#### Building a flowchart end-to-end

```javascript
// 1. Section to wrap the diagram
figma_create_section({ x: 0, y: 0, width: 1000, height: 600, name: "User signup flow" })
// → returns { node: { id: 'XX:1', ... } }

// 2. Process steps as shapes-with-text
figma_create_shape_with_text({
  x: 40, y: 80, width: 200, height: 80,
  shapeType: 'ROUNDED_RECTANGLE',
  text: 'Start',
  parentId: 'XX:1'
})
figma_create_shape_with_text({
  x: 320, y: 80, width: 200, height: 120,
  shapeType: 'DIAMOND',
  text: 'Email valid?',
  parentId: 'XX:1'
})
// ...etc.

// 3. Connectors between them
figma_create_connector({
  start: { nodeId: 'XX:2', magnet: 'AUTO' },
  end:   { nodeId: 'XX:3', magnet: 'AUTO' },
  lineType: 'ELBOWED',
  parentId: 'XX:1'
})
// endCap defaults to ARROW_EQUILATERAL — you get an arrow without specifying

// 4. Add a sticky for context
figma_create_sticky({
  x: 600, y: 80,
  text: 'TODO: rate-limit this endpoint',
  parentId: 'XX:1'
})
```

#### FigJam node types not creatable via this MCP

`STAMP`, `HIGHLIGHT`, `WASHI_TAPE`, `WIDGET`, and `MEDIA` cannot be created from a non-widget plugin (Figma's API doesn't expose factory methods, or requires a pre-uploaded image hash). They can still be cloned, moved, deleted, and serialized through existing tools — they just can't be created from scratch.

---

### Structure Commands

#### `figma_reparent_nodes`
Move nodes to a different parent container.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Array of node IDs to move |
| `newParentId` | string | Yes | New parent node ID (must be a frame, group, or page) |
| `index` | number | No | Position within the new parent (0 = bottom/back). Defaults to top/front. |

#### `figma_move_to_page`
Move nodes from their current page to a different page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Array of node IDs to move |
| `targetPageId` | string | Yes | Destination page ID |
| `x` | number | No | X position on target page |
| `y` | number | No | Y position on target page |

#### `figma_set_rotation`
Set the rotation of one or more nodes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Array of node IDs to rotate |
| `rotation` | number | Yes | Rotation in degrees (-180 to 180) |

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

1. Ensure the MCP server is running.
2. **Ask Claude what port the bridge is on** — the MCP server tells Claude its actual WebSocket port via the `instructions` field on session init, and Claude will surface it proactively when `figma_get_context` reports `connected: false`. You can also call `figma_server_info` directly to see the port.
3. Match that port in the Figma plugin UI's port input.
4. Re-run the plugin in Figma (`Cmd+Option+P`).

### Port Already in Use

The server automatically tries ports 3055–3070 in order. The actual bound port may differ from the default if you have multiple sessions running. To force a specific port:
```bash
FIGMA_BRIDGE_PORT=3057 node src/index.js
```

### Multiple Claude Code Instances

Each Claude Code instance spawns its own MCP server, and each binds to the next available port in the 3055–3070 range. The bridge handles this automatically:

1. Start as many Claude Code sessions as you want — each picks an open port.
2. **Ask Claude in each session what port it's on** (or call `figma_server_info`). The MCP server's instructions tell Claude to surface this when not connected.
3. **In each Figma file's plugin instance:** type the matching port number and click Connect.

You can confirm which version + port a given session is on with `figma_server_info` — it returns `{ version, port, connected, documentInfo }`.

### Commands Timing Out

- Commands have a 30-second timeout
- Large exports may timeout; try smaller scales
- Check plugin is still connected (green status)

### Font Errors

Text operations require font loading. The plugin handles this automatically, but if a font isn't installed, it will fail. Use fonts available on your system.

---

## License

MIT
