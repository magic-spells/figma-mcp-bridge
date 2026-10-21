# Figma MCP Bridge

A Model Context Protocol (MCP) server that enables Claude to read and manipulate **Figma design files and FigJam files** in real-time through a WebSocket bridge to a Figma plugin.

## Features

- **98 operations** - 73 Figma design tools + 21 FigJam tools (sticky notes, flowchart shapes, connectors, tables, code blocks, link previews) + 4 Prototype tools (reactions, flow starting points)
- **Works in both editors, plus read-only Dev Mode** - Auto-detects whether you're in a Figma design file or FigJam, and gates editor-specific commands accordingly (FigJam-only sticky/connector/table tools; Figma-Design-only prototype tools). In Dev Mode the plugin runs read-only — see [Dev Mode support](#dev-mode-support)
- **Real-time bidirectional communication** - Changes appear instantly in Figma/FigJam
- **Token-optimized queries** - Efficient variable search and node traversal for AI interactions
- **Full Figma API access** - Styles, variables, auto-layout, components and team libraries, plus FigJam diagrams and documentation
- **Built-in skills** - Ships its own operating guide as MCP resources (`skill://figma-bridge/SKILL.md`); connected agents are directed to read it before write-heavy work, so no separate skill install is needed

## Architecture

```
Claude Code ←──stdio──→ MCP Server ←──WebSocket──→ Figma Plugin ←──→ Figma API
                        (Node.js)    localhost:3055    (runs in Figma)
```

## Dev Mode Support

The plugin also runs in Figma **Dev Mode** (e.g. on a Developer seat, or a view-only file opened in Dev Mode). It appears in the inspect panel's plugin area with a **read-only** badge next to the port field.

Dev Mode plugins get a read-only document — this is a Figma platform restriction, not a bridge limitation — so only the read tools work there:

- `figma_get_context`, `figma_list_pages`, `figma_get_nodes`, `figma_get_children`
- `figma_search_nodes`, `figma_search_components`, `figma_search_styles`, `figma_search_variables`
- `figma_get_local_styles`, `figma_get_local_variables`
- `figma_export_node`
- `figma_set_selection`, `figma_set_current_page` (selection/navigation, not document edits)

Every mutation tool returns a `READ_ONLY_EDITOR` error naming the tool. To edit the file, open it in the Figma Design editor with an editor seat.

If you only need read access to designs and tokens, also consider [Figma's official MCP server](https://help.figma.com/hc/en-us/articles/32132100833559), which specializes in design-to-code extraction. This bridge's Dev Mode support exists so bridge users keep one consistent tool surface — its real differentiator (writing to the document) requires the Design editor.

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
| `depth` | string | No | Detail level: `minimal`, `compact` (adds x/y/width/height), or `full` (default) |

`full` includes `boundVariables`, `explicitVariableModes`, `layoutWrap`, `counterAxisSpacing`, `clipsContent` and per-side stroke weights.

`compact` and `full` also describe components and text styles. An `INSTANCE` carries `mainComponent` (`id`, `name`, `key`, `remote`, and `parentSet` `{ id, name, key }` when it is a variant) and `componentProperties` as `{ name: value }`; a `TEXT` node carries `textStyleId` (`"MIXED"` across ranges) and `textStyleName`. `figma_get_children` and `figma_search_nodes` add the same fields.

Composite instance-sublayer IDs (`I<instanceId>;<childId>`) resolve reliably — if the direct lookup misses, the instance root is resolved and its subtree searched. IDs that genuinely don't exist are returned in `notFound`, with an explanation in `notFoundDetails`.

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
| `compact` | boolean | No | `true` | Return minimal data: `id`, `name`, `type`, `x`, `y`, `parentId`, `childCount` |

Compact results include `x`/`y`, so they can be used to measure layout (for example, which children share a row after wrapping) without dropping to the full serialization. Instances carry `mainComponent` and `componentProperties`, and text nodes `textStyleId` / `textStyleName`, as in `figma_get_nodes`.

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

Compact results include each component's `key`. This searches the open file only; for a team-library component use `figma_import_library_component`.

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

#### `figma_create_svg`
Import SVG markup as nodes, using Figma's own SVG import. **Use it for icons and logos:** import the app's real `.svg` file instead of drawing glyphs from lines and ellipses.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `svg` | string | Yes | | Complete SVG markup (the contents of an `.svg` file), at most 500,000 characters |
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `width` | number | No | | Width. Alone, scales proportionally; with `height`, fits the content inside the box, centered |
| `height` | number | No | | Height. Alone, scales proportionally; with `width`, fits the content inside the box, centered |
| `name` | string | No | `"SVG"` | Node name |
| `flatten` | boolean | No | `false` | Merge the shapes into one `VECTOR` inside the frame (for one-color icons drawn all in strokes or all in fills) |
| `fillColor` | string | No | | Hex color (`#RGB` or `#RRGGBB`) for `fill="currentColor"` |
| `strokeColor` | string | No | | Hex color (`#RGB` or `#RRGGBB`) for `stroke="currentColor"` |
| `parentId` | string | No | | Parent node ID |

**Returns:** `{ success, nodeId, node }`, plus `vectorId` when flattened, `currentColor: { replaced, fill, stroke }` when `currentColor` was replaced, and `warnings` when something did not go as asked.

The result is a `FRAME` at the SVG's own size: its `width` and `height`, which default to its `viewBox`. It is kept even with `flatten`, because it holds the icon's padding: icons imported this way share one box and line up. `flatten` suits icons whose shapes are all stroked (like Lucide) or all filled, because the merged vector carries one set of fills and strokes; flattening shapes painted differently comes back with a warning.

**`currentColor`.** Icon sets such as Lucide and Heroicons draw with `stroke="currentColor"` or `fill="currentColor"`, which Figma can't resolve. The bridge replaces it before import, in attributes, `style=""` and `<style>` blocks. A stroke takes `strokeColor` and a fill takes `fillColor`; each falls back to the other, then to `#000000`, which is what a browser uses when nothing sets `color`. Any other use, such as a gradient's `stop-color`, gets the fill color. Colors passed for an SVG that never uses `currentColor` produce a warning rather than being silently ignored.

**Sizing** matches a browser. One dimension rescales the content uniformly with the Scale tool, so stroke widths scale too: a 2px Lucide stroke is 1.33px at 16px. Both dimensions fit the content inside the box and center it, as `preserveAspectRatio="xMidYMid meet"` does. Size the icon here rather than with `figma_resize_nodes` afterwards, which leaves stroke weights as they are.

Markup Figma can't parse fails with `INVALID_SVG`. A `parentId` that doesn't exist fails with `NODE_NOT_FOUND` before anything is created, and any later failure removes the imported frame, so a failed call leaves nothing behind.

```js
// Lucide's "x" at 20px, in the button's text color
figma_create_svg({
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  name: 'icon/x',
  width: 20,
  strokeColor: '#1F2937',
  flatten: true,
  parentId: '12:34'
})
```

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
Create an instance of a component in the file, or of a published team-library component imported by key. A component set instantiates its default variant; `properties` picks another and sets text, boolean and instance-swap properties in the same call (see `figma_set_instance_properties`). The parent and component are resolved first, and the instance is removed if a later step fails.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `componentId` | string | One of | COMPONENT or COMPONENT_SET ID in this file |
| `componentKey` | string | One of | Published library component or component set key |
| `properties` | object | No | `{ name: value }`, e.g. `{ "Variant": "Primary", "Size": "default", "Label": "Save" }` |
| `x` | number | No | X position (ignored inside auto-layout) |
| `y` | number | No | Y position (ignored inside auto-layout) |
| `parentId` | string | No | Parent node ID (defaults to current page) |
| `index` | number | No | Position among the parent's children (0 = back / first in auto-layout); omit to add at the end |
| `name` | string | No | Instance name |
| `compact` | boolean | No | Default `true`: `node` is `id`, `name`, `type`, `parentId`, `x`, `y`, `width`, `height`, `rotation`, `opacity`, `visible`, `locked`. `false` returns the full node |

The response carries `nodeId`, `node`, `mainComponent` and the resulting `componentProperties`, plus `warnings` when a `TEXT` property is not shown by any text layer (see `figma_set_instance_properties`).

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
Set stroke color and/or weight on a node. Omit `strokes` to change weights only.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to modify |
| `strokes` | color | No | Stroke color (omit to leave existing colors untouched) |
| `strokeWeight` | number | No | Uniform stroke weight in pixels (applied before any per-side weights) |
| `strokeTopWeight` / `strokeRightWeight` / `strokeBottomWeight` / `strokeLeftWeight` | number | No | Per-side weights in pixels. `RECTANGLE` and frame-like nodes only (`FRAME`, `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, `SLOT`, `SLIDE`) |

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

#### `figma_set_visible`
Show or hide nodes. Use this rather than binding a BOOLEAN variable or setting opacity to 0 just to hide something.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to show or hide |
| `visible` | boolean | Yes | `true` to show, `false` to hide |

#### `figma_set_clips_content`
Set whether frame-like nodes clip their children to the frame bounds. Works on `FRAME`, `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, `SLOT`, `SLIDE`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to modify |
| `clipsContent` | boolean | Yes | `true` to clip, `false` to let children overflow |

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
Apply a style to a node: a local style, or a library style once `figma_import_library_style` has returned its local id.

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
| `nodeId` | string | No | Node ID (for binding). A style ID here is routed to the style path |
| `styleId` | string | No | Local style ID to bind instead of a node (TEXT or PAINT styles) |
| `field` | string | No | Field to bind (`opacity`, `cornerRadius`, `fills`, etc.; text styles: `fontSize`, `lineHeight`, `fontFamily`, …; paint styles: `paints`) |
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

#### `figma_delete_style`
Delete a local style (paint, text, effect or grid). Library styles return `REMOTE_STYLE`. Nodes using the style keep their resolved values but lose the link. Find IDs with `figma_search_styles`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `styleId` | string | Yes | Style ID to delete (e.g. `"S:abc123..."`) |

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
Resize nodes. The resulting size is verified (`RESIZE_NO_OP` when nothing changed), and width/height variable bindings are captured before the write and re-applied afterwards — recovered binds appear in `rebound`, unrecoverable ones in `warnings`. Resizing a node inside an `INSTANCE` returns `INSTANCE_SUBLAYER_RESTRICTED` rather than a false success; use `figma_set_layout_align: STRETCH`, which works inside instances and preserves binds.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to resize |
| `width` | number | No | New width |
| `height` | number | No | New height |

#### `figma_set_size_limits`
Set or **clear** min/max size limits. Pass a positive number to set, explicit `null` to remove — so `maxWidth` is no longer a one-way door. Limits apply to auto-layout frames and their direct children; anything else gets a warning. Every write is verified (`LIMIT_NOT_APPLIED` / `LIMIT_NOT_CLEARED`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeIds` | string[] | Yes | Nodes to update |
| `minWidth` | number/null | No | Minimum width; `null` clears, omit to leave unchanged |
| `maxWidth` | number/null | No | Maximum width; `null` clears, omit to leave unchanged |
| `minHeight` | number/null | No | Minimum height; `null` clears, omit to leave unchanged |
| `maxHeight` | number/null | No | Maximum height; `null` clears, omit to leave unchanged |

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
Change z-order (layer order) among siblings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node to reorder |
| `position` | string/number | Yes | `"front"`, `"back"`, or the **final** zero-based index |

A numeric `position` is the final index the node ends up at — ask for 2 and it is at 2 when the call returns. Figma sorts `children` back-to-front, so **0 is the bottom** of the layer stack and `childCount - 1` is the top; `"back"` is 0 and `"front"` is the last index. Out-of-range indices are clamped and the response reports `clamped: true` with a message. The final index is read back and verified — a mismatch fails with `REORDER_FAILED` instead of reporting success.

Reordering children of an `INSTANCE` is blocked by Figma and returns `INSTANCE_SUBLAYER_RESTRICTED`; reorder on the component master instead.

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
Export a node as an image. **The image is written to disk and the file path is returned** — read that file to view the render.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeId` | string | Yes | | Node to export |
| `format` | string | No | `"PNG"` | Format: `PNG`, `SVG`, `JPG`, `PDF` |
| `scale` | number | No | `1` | Export scale (1 = 100%) |
| `outputPath` | string | No | | Absolute file path to write to. Parent directories are created. |
| `returnBase64` | boolean | No | `false` | Return base64 data inline instead of writing a file |

**Returns:** `{ success, nodeId, path, format, scale, bytes }` — no inline image data.

Omit `outputPath` and the file lands at `<tmpdir>/figma-mcp-bridge/<node-id>-<timestamp>.<ext>`. This is file-first by design: inline base64 can't be viewed, which used to force callers to inflate `scale` until the response was large enough to spill to a readable file. An unwritable path fails with `EXPORT_WRITE_FAILED` rather than silently losing the export.

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

#### `figma_import_library_component`
Import a component or component set published from a team library, by key. Returns the imported `nodeId` (usable as `componentId` anywhere), `name`, `key`, `remote` and `componentPropertyDefinitions` — each property's `type` (`VARIANT`, `TEXT`, `BOOLEAN`, `INSTANCE_SWAP`), `defaultValue` and `variantOptions`. A set also returns `defaultVariant` and `variantCount`, and with `includeVariants` its `variants` (`id`, `name`, `key`, `variantProperties`) — off by default, since the property definitions already name every variant option and a large set lists hundreds; a variant returns its `variantProperties` and `parentSet`. A key that is not a published library component fails with `LIBRARY_IMPORT_FAILED`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `key` | string | Yes | | Component or component set key |
| `kind` | string | No | `auto` | `auto` (tries a set, then a component), `component` or `componentSet` |
| `includeVariants` | boolean | No | `false` | List each variant of a set |

An existing instance's keys are in its `figma_get_nodes` read: `mainComponent.key` and `mainComponent.parentSet.key`.

#### `figma_import_library_style`
Import published text, paint, effect or grid styles by key. Returns each style's local `id` for `figma_apply_style`, with `name`, `type` and `key`. Keys import in parallel; any that fail are listed in `errors` (`LIBRARY_IMPORT_FAILED`) and make the call an error, with the imported styles still listed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | One of | One style key |
| `keys` | string[] | One of | Several style keys (at most 50) |

#### `figma_set_instance_properties`
Set component properties on an instance: variants, `TEXT`, `BOOLEAN`, and `INSTANCE_SWAP` (by component ID or library component key). Figma suffixes non-variant property names with `#id` (`Label#12:0`); the base name works when unambiguous. Names and values are checked against the main component's definitions first, so a typo fails with `INVALID_PROPERTIES` listing the valid choices, and every value is verified by readback (`PROPERTIES_NOT_APPLIED`).

`componentProperties` reads a `TEXT` value back even when nothing shows it: a variant can define the property without binding its text layer to it. So a `TEXT` value is also looked for in the text layers bound to it (`componentPropertyReferences.characters`). The call still succeeds, since the property is set, but `warnings` says what the canvas shows: `TEXT_PROPERTY_UNBOUND: …` names the variant whose text layer is not bound, and `TEXT_PROPERTY_NOT_RENDERED: …` names a bound layer showing other text. Both mean the component needs fixing.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instanceId` | string | Yes | Instance node ID |
| `properties` | object | Yes | `{ name: string \| boolean }`, e.g. `{ "Variant": "Secondary", "Label": "Cancel", "Show icon": true }` |

Returns `applied` (full names), `mainComponent` (which follows the variant), `componentProperties`, `width`, `height` and any `warnings`.

#### `figma_replace_with_instance`
Replace a node — typically a hand-made control — with an instance, in the same parent at the same layer index. Outside auto-layout (or when absolutely positioned) the instance takes the target's `x`/`y` and constraints; inside auto-layout it takes `FILL` on any axis the target filled. Hug/fixed sizes come from the component unless `matchSize` is set. The instance also keeps the target's rotation, visibility, lock and opacity (and a variable bound to `visible` or `opacity`, or, inside a component, a component property bound to its visibility), and its layer name unless `name` is given; fills, strokes, effects and blend mode are the component's, and a flipped target's flip is not carried. The target is deleted only after the instance is fully set up; on any failure the instance is removed and the target is left as it was. A component or component set cannot be the target (deleting it would detach its instances).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetId` | string | Yes | Node to replace |
| `componentId` | string | One of | Component or set ID in this file |
| `componentKey` | string | One of | Published library component or set key |
| `properties` | object | No | Component properties, as in `figma_set_instance_properties` |
| `textProperty` | string | No | TEXT property that receives the target's text (its own, or its first text layer's); an explicit value in `properties` wins |
| `matchSize` | boolean | No | Resize to the target's width/height (filled axes stay `FILL`) |
| `name` | string | No | Instance name (defaults to the target's name) |
| `compact` | boolean | No | Default `true`; `false` returns the full node, as in `figma_create_instance` |

Returns `nodeId`, `node`, `replacedId`, `copiedText`, `mainComponent`, `componentProperties` and any `warnings` (text-layer checks as in `figma_set_instance_properties`, or a variable bind that could not be carried).

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

#### `figma_set_variable_mode`
Pin an explicit variable mode on nodes **or pages**, or clear an existing pin. This is how a preview/page frame is made to resolve a particular mode (e.g. a mobile frame pinned to the Spacing collection's `mobile` mode) — no more cloning a frame just to inherit its mode. Pins are per-collection and travel through clones and instances, so `clear: true` is the fix for a bad inherited pin. The response echoes each node's resulting `explicitVariableModes` (`{}` means nothing is pinned).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeIds` | string[] | Yes | | Node IDs or page IDs to pin/unpin |
| `collectionId` | string | Yes | | Variable collection the pin applies to |
| `modeId` | string | No | | Mode to pin. Required unless `clear` is true |
| `clear` | boolean | No | `false` | Remove this collection's pin instead of setting one |

#### `figma_unbind_variable`
Remove a variable binding from a node property. On a min/max size field it also clears the residual literal (reported as `previousLiteral` / `clearedLiteral`) — without that, unbinding `maxWidth` freezes the last resolved number as a permanent clamp.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeId` | string | Yes | | Node ID to unbind from |
| `field` | string | Yes | | Field to unbind (`fills`, `strokes`, `opacity`, `maxWidth`, etc.) |
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

### Prototype Commands

These tools set up prototype interactions on **Figma Design** nodes. They operate on the `reactions` array (read/written via `setReactionsAsync`) and the page-level `flowStartingPoints` list. They are not applicable to FigJam files.

#### `figma_get_reactions`
Read all reactions currently set on a node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node ID to read reactions from |

Returns the full `reactions` array including trigger and actions details for each reaction.

#### `figma_add_reaction`
Add a prototype interaction to a node. Existing reactions are preserved — each call appends one new reaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node ID to add the reaction to |
| `trigger` | object | Yes | What initiates the interaction (see Trigger types below) |
| `action` | object | Yes | What happens when the trigger fires (see Action types below) |

**Trigger types:**

| `type` | Extra fields | Description |
|--------|-------------|-------------|
| `ON_CLICK` | — | Tap / click |
| `ON_HOVER` | — | Hover |
| `ON_PRESS` | — | Press and hold |
| `ON_DRAG` | — | Drag |
| `ON_MEDIA_END` | — | Media playback ends |
| `AFTER_TIMEOUT` | `timeout` (ms) | Auto-advance after delay |
| `MOUSE_UP` | `delay` (ms) | Mouse button released |
| `MOUSE_DOWN` | `delay` (ms) | Mouse button pressed |
| `MOUSE_ENTER` | `delay` (ms) | Cursor enters element |
| `MOUSE_LEAVE` | `delay` (ms) | Cursor leaves element |
| `ON_KEY_DOWN` | `keyCodes` (number[]), `device` | Key pressed |
| `ON_MEDIA_HIT` | `mediaHitTime` (seconds) | Media reaches timestamp |

`device` values for `ON_KEY_DOWN`: `KEYBOARD` (default), `XBOX_ONE`, `PS4`, `SWITCH_PRO`, `UNKNOWN_CONTROLLER`.

**Action types:**

| `type` | Key fields | Description |
|--------|-----------|-------------|
| `NODE` | `destinationId`, `navigation`, `transition` | Navigate to / open / scroll to a frame |
| `BACK` | — | Go back to previous frame |
| `CLOSE` | — | Close the current overlay |
| `URL` | `url`, `openInNewTab` (bool) | Open a URL — set `openInNewTab: true` to open in a new tab |

For `NODE` actions, the `navigation` field controls the behaviour:

| `navigation` | Description |
|-------------|-------------|
| `NAVIGATE` | Navigate to destination frame (default) |
| `OVERLAY` | Open destination as an overlay |
| `SWAP` | Swap the current frame with destination |
| `SCROLL_TO` | Scroll to destination within the current frame |
| `CHANGE_TO` | Change component to a different variant |

**Transition object** (optional, for `NODE` actions):

| Field | Values | Notes |
|-------|--------|-------|
| `type` | `DISSOLVE`, `SMART_ANIMATE`, `SCROLL_ANIMATE` | Simple transitions — no `direction` |
| `type` | `MOVE_IN`, `MOVE_OUT`, `PUSH`, `SLIDE_IN`, `SLIDE_OUT` | Directional — requires `direction` |
| `direction` | `LEFT`, `RIGHT`, `TOP`, `BOTTOM` | Required for directional types |
| `matchLayers` | boolean (default `false`) | Smart-match shared layers — directional types only |
| `duration` | number (seconds) | Default `0.3` |
| `easing.type` | `LINEAR`, `EASE_IN`, `EASE_OUT`, `EASE_IN_AND_OUT`, `EASE_IN_BACK`, `EASE_OUT_BACK`, `EASE_IN_AND_OUT_BACK`, `CUSTOM_CUBIC_BEZIER`, `GENTLE`, `QUICK`, `BOUNCY`, `SLOW`, `CUSTOM_SPRING` | `GENTLE`/`QUICK`/`BOUNCY`/`SLOW` are spring presets |

**Example — click to navigate with a slide transition:**
```javascript
figma_add_reaction({
  nodeId: '10:5',
  trigger: { type: 'ON_CLICK' },
  action: {
    type: 'NODE',
    destinationId: '10:20',
    navigation: 'NAVIGATE',
    transition: {
      type: 'SLIDE_IN',
      direction: 'LEFT',
      duration: 0.3,
      easing: { type: 'EASE_OUT' }
    }
  }
})
```

**Example — auto-advance after 3 seconds:**
```javascript
figma_add_reaction({
  nodeId: '10:5',
  trigger: { type: 'AFTER_TIMEOUT', timeout: 3000 },
  action: {
    type: 'NODE',
    destinationId: '10:30',
    navigation: 'NAVIGATE',
    transition: { type: 'DISSOLVE', duration: 0.5, easing: { type: 'EASE_IN_AND_OUT' } }
  }
})
```

#### `figma_remove_reaction`
Remove a reaction from a node by its zero-based index. Use `figma_get_reactions` first to identify the index.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeId` | string | Yes | Node ID to remove the reaction from |
| `index` | number | Yes | Zero-based index of the reaction to remove |

#### `figma_set_flow_starting_point`
Set or clear a prototype flow starting point. Flow starting points are page-level — Figma stores them on the parent `PageNode` as a list of `{ nodeId, name }` entries. The first entry is the default when entering Presentation view with nothing selected.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `nodeId` | string | Yes | | `FRAME`, `COMPONENT`, or `COMPONENT_SET` node ID |
| `flowName` | string | No | `"Flow 1"` | Display name for the flow. If the frame is already a starting point, its name is updated. |
| `clear` | boolean | No | | If `true`, removes the flow starting point for this frame from the page |

> Top-level frames (direct children of a page) are the typical starting points. The Figma typings mark `PageNode.flowStartingPoints` as `ReadonlyArray`, but the runtime accepts direct assignment — that's the documented (if quirky) pattern this tool uses internally.

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
| `pivot` | string | No | `center` (default) keeps the visual center in place; `top-left` is Figma's raw `node.rotation` behavior. Non-absolute auto-layout children always rotate about the top-left, with a warning |

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
| `nameContains` | string | | Case-insensitive substring match |
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
- **Constraints** don't work on auto-layout children (use `layoutAlign`)
- **Lines** have height=0, use `length` parameter
- **`detachInstance()`** also detaches ancestor instances
- **Instance sublayers** can't be resized, size-bound, or reordered — Figma blocks these, and the bridge returns `INSTANCE_SUBLAYER_RESTRICTED` rather than a false success. Act on the component master, or use `figma_set_layout_align: STRETCH`
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

---

<p align="center">
  Made by <a href="https://github.com/coryschulz">Cory Schulz</a>
</p>
