/**
 * Tool registry - registers all Figma tools with the MCP server
 */

import { z } from 'zod';
import { handleGetContext } from './context.js';
import { handleListPages } from './pages.js';
import { handleGetNodes } from './nodes.js';
import {
  handleSetFills,
  handleSetStrokes,
  handleCreateRectangle,
  handleSetText,
  handleCloneNodes,
  handleDeleteNodes,
  handleMoveNodes,
  handleResizeNodes,
  handleSetOpacity,
  handleSetCornerRadius,
  handleGroupNodes,
  handleUngroupNodes,
  handleCreateFrame,
  handleCreateText,
  handleSetSelection,
  handleSetCurrentPage,
  handleExportNode,
  // Phase 2 commands
  handleCreateEllipse,
  handleSetEffects,
  handleSetAutoLayout,
  handleGetLocalStyles,
  handleApplyStyle,
  handleCreateComponent,
  handleCreateInstance,
  // Phase 3 commands
  handleGetLocalVariables,
  handleSearchVariables,
  handleSetVariable,
  handleCreateLine,
  handleSetConstraints,
  // Phase 4 commands
  handleCreatePolygon,
  handleBooleanOperation,
  handleZoomToNode,
  handleSetBlendMode,
  handleDetachInstance,
  // Phase 5 commands
  handleSetLayoutAlign,
  handleCreateVector,
  handleRenameNode,
  handleReorderNode,
  // Smart Query commands
  handleSearchNodes,
  handleSearchComponents,
  handleSearchStyles,
  handleGetChildren,
  // Design System Creation commands
  handleSetTextStyle,
  handleCreatePaintStyle,
  handleCreateTextStyle,
  handleCreateVariableCollection,
  handleCreateVariable,
  handleRenameVariable,
  handleDeleteVariables,
  handleDeleteVariableCollection,
  handleRenameVariableCollection,
  handleRenameMode,
  handleAddMode,
  handleDeleteMode,
  handleUnbindVariable,
  // Page Management commands
  handleCreatePage,
  handleRenamePage,
  handleDeletePage,
  handleReorderPage,
  // Node Structure commands
  handleReparentNodes,
  handleMoveToPage,
  // Instance commands
  handleSwapInstance,
  // Additional commands
  handleDuplicatePage,
  handleSetRotation,
  handleSetLayoutGrids
} from './mutations.js';

// Color schema for fill/stroke shorthand
const colorSchema = z.union([
  z.object({
    color: z.string().describe('Hex color (e.g., "#FF0000" or "#FF0000FF" with alpha)')
  }),
  z.object({
    r: z.number().min(0).max(1).describe('Red (0-1)'),
    g: z.number().min(0).max(1).describe('Green (0-1)'),
    b: z.number().min(0).max(1).describe('Blue (0-1)'),
    a: z.number().min(0).max(1).optional().describe('Alpha (0-1, optional)')
  }),
  z.array(z.any()).describe('Full Figma fills array')
]);

/**
 * Register all tools with the MCP server
 * @param {McpServer} server - MCP Server instance
 * @param {FigmaBridge} bridge - Figma bridge instance
 */
export function registerTools(server, bridge) {
  // ============================================================
  // Server Info
  // ============================================================

  // figma_server_info - Get MCP server info including port
  server.tool(
    'figma_server_info',
    'Get information about the MCP server including the WebSocket port it is running on.',
    {},
    async () => ({
      content: [{
        type: 'text',
        text: JSON.stringify({
          port: bridge.port,
          connected: bridge.isConnected(),
          documentInfo: bridge.getDocumentInfo()
        }, null, 2)
      }]
    })
  );

  // ============================================================
  // Query Tools
  // ============================================================

  // figma_get_context - Get current document context
  server.tool(
    'figma_get_context',
    'Get the current Figma document context including file info, current page, and selection. Use this to understand what document is open and what the user has selected.',
    {},
    async () => handleGetContext(bridge)
  );

  // figma_list_pages - List all pages
  server.tool(
    'figma_list_pages',
    'List all pages in the current Figma document. Returns page IDs, names, and indicates which page is currently active.',
    {},
    async () => handleListPages(bridge)
  );

  // figma_get_nodes - Get node details by ID
  server.tool(
    'figma_get_nodes',
    'Get detailed information about specific Figma nodes by their IDs. Returns node properties including type, position, size, fills, strokes, and more. TIP: Use figma_search_nodes or figma_get_children FIRST to find node IDs efficiently, then use this tool only for nodes you need full details on.',
    {
      nodeIds: z.array(z.string()).describe('Array of Figma node IDs (e.g., ["1:23", "4:56"])'),
      depth: z.enum(['minimal', 'compact', 'full']).optional().default('full').describe('Detail level: "minimal" (~5 props: id, name, type, childIds), "compact" (~10 props: + position/size), "full" (all ~40 props). Use minimal/compact for tree traversal to reduce tokens.')
    },
    async (args) => handleGetNodes(bridge, args)
  );

  // ============================================================
  // Mutation Tools
  // ============================================================

  // figma_set_fills - Set fill colors on a node
  server.tool(
    'figma_set_fills',
    'Set the fill color(s) on a Figma node. Accepts hex color shorthand like { color: "#FF0000" } or full fills array.',
    {
      nodeId: z.string().describe('The node ID to modify'),
      fills: colorSchema.describe('Fill color - use { color: "#RRGGBB" } for simple colors')
    },
    async (args) => handleSetFills(bridge, args)
  );

  // figma_set_strokes - Set stroke colors on a node
  server.tool(
    'figma_set_strokes',
    'Set the stroke color(s) on a Figma node. Accepts hex color shorthand like { color: "#FF0000" } or full strokes array.',
    {
      nodeId: z.string().describe('The node ID to modify'),
      strokes: colorSchema.describe('Stroke color - use { color: "#RRGGBB" } for simple colors'),
      strokeWeight: z.number().optional().describe('Stroke weight in pixels')
    },
    async (args) => handleSetStrokes(bridge, args)
  );

  // figma_create_rectangle - Create a new rectangle
  server.tool(
    'figma_create_rectangle',
    'Create a new rectangle in the Figma document. Returns the created node.',
    {
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      width: z.number().optional().default(100).describe('Width in pixels'),
      height: z.number().optional().default(100).describe('Height in pixels'),
      name: z.string().optional().default('Rectangle').describe('Node name'),
      fills: colorSchema.optional().describe('Fill color'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)')
    },
    async (args) => handleCreateRectangle(bridge, args)
  );

  // figma_set_text - Set text content on a text node
  server.tool(
    'figma_set_text',
    'Set the text content of a text node. Automatically loads required fonts.',
    {
      nodeId: z.string().describe('The text node ID to modify'),
      text: z.string().describe('The new text content')
    },
    async (args) => handleSetText(bridge, args)
  );

  // figma_clone_nodes - Clone/duplicate nodes
  server.tool(
    'figma_clone_nodes',
    'Clone (duplicate) one or more nodes. Returns the cloned nodes.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to clone'),
      parentId: z.string().optional().describe('Parent node ID for clones (optional)'),
      offset: z.object({
        x: z.number().optional().default(20).describe('X offset from original'),
        y: z.number().optional().default(20).describe('Y offset from original')
      }).optional().describe('Position offset for cloned nodes')
    },
    async (args) => handleCloneNodes(bridge, args)
  );

  // ============================================================
  // Node Manipulation Tools
  // ============================================================

  // figma_delete_nodes - Delete nodes
  server.tool(
    'figma_delete_nodes',
    'Delete one or more nodes from the Figma document.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to delete')
    },
    async (args) => handleDeleteNodes(bridge, args)
  );

  // figma_move_nodes - Move nodes
  server.tool(
    'figma_move_nodes',
    'Move one or more nodes to a new position. Use relative=true to offset from current position.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to move'),
      x: z.number().optional().describe('X position (absolute) or offset (if relative=true)'),
      y: z.number().optional().describe('Y position (absolute) or offset (if relative=true)'),
      relative: z.boolean().optional().default(false).describe('If true, x/y are offsets from current position')
    },
    async (args) => handleMoveNodes(bridge, args)
  );

  // figma_resize_nodes - Resize nodes
  server.tool(
    'figma_resize_nodes',
    'Resize one or more nodes. At least one dimension (width or height) must be provided.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to resize'),
      width: z.number().optional().describe('New width in pixels'),
      height: z.number().optional().describe('New height in pixels')
    },
    async (args) => handleResizeNodes(bridge, args)
  );

  // figma_set_opacity - Set node opacity
  server.tool(
    'figma_set_opacity',
    'Set the opacity (transparency) of a node. 0 is fully transparent, 1 is fully opaque.',
    {
      nodeId: z.string().describe('The node ID to modify'),
      opacity: z.number().min(0).max(1).describe('Opacity value from 0 (transparent) to 1 (opaque)')
    },
    async (args) => handleSetOpacity(bridge, args)
  );

  // figma_set_corner_radius - Set corner radius
  server.tool(
    'figma_set_corner_radius',
    'Set the corner radius of a node. Use radius for uniform corners, or individual values for different corners.',
    {
      nodeId: z.string().describe('The node ID to modify'),
      radius: z.number().optional().describe('Uniform corner radius for all corners'),
      topLeft: z.number().optional().describe('Top-left corner radius'),
      topRight: z.number().optional().describe('Top-right corner radius'),
      bottomLeft: z.number().optional().describe('Bottom-left corner radius'),
      bottomRight: z.number().optional().describe('Bottom-right corner radius')
    },
    async (args) => handleSetCornerRadius(bridge, args)
  );

  // figma_group_nodes - Group nodes
  server.tool(
    'figma_group_nodes',
    'Group multiple nodes together into a single group.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to group together'),
      name: z.string().optional().default('Group').describe('Name for the new group')
    },
    async (args) => handleGroupNodes(bridge, args)
  );

  // figma_ungroup_nodes - Ungroup nodes
  server.tool(
    'figma_ungroup_nodes',
    'Ungroup one or more group nodes, releasing their children.',
    {
      nodeIds: z.array(z.string()).describe('Array of group node IDs to ungroup')
    },
    async (args) => handleUngroupNodes(bridge, args)
  );

  // ============================================================
  // Creation Tools
  // ============================================================

  // figma_create_frame - Create a new frame
  server.tool(
    'figma_create_frame',
    'Create a new frame in the Figma document. Frames are containers that can hold other elements and support auto-layout.',
    {
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      width: z.number().optional().default(100).describe('Width in pixels'),
      height: z.number().optional().default(100).describe('Height in pixels'),
      name: z.string().optional().default('Frame').describe('Frame name'),
      fills: colorSchema.optional().describe('Fill color'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)')
    },
    async (args) => handleCreateFrame(bridge, args)
  );

  // figma_create_text - Create a new text node
  server.tool(
    'figma_create_text',
    'Create a new text node in the Figma document.',
    {
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      text: z.string().optional().default('Text').describe('The text content'),
      fontSize: z.number().optional().default(16).describe('Font size in pixels'),
      fontFamily: z.string().optional().default('Inter').describe('Font family name'),
      fontStyle: z.string().optional().default('Regular').describe('Font style (Regular, Bold, etc.)'),
      fills: colorSchema.optional().describe('Text color'),
      name: z.string().optional().default('Text').describe('Node name'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)')
    },
    async (args) => handleCreateText(bridge, args)
  );

  // ============================================================
  // Navigation Tools
  // ============================================================

  // figma_set_selection - Set the current selection
  server.tool(
    'figma_set_selection',
    'Set the current selection in Figma. Pass an empty array to clear selection.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to select (empty array to clear)')
    },
    async (args) => handleSetSelection(bridge, args)
  );

  // figma_set_current_page - Switch to a different page
  server.tool(
    'figma_set_current_page',
    'Switch to a different page in the Figma document.',
    {
      pageId: z.string().describe('The page ID to switch to')
    },
    async (args) => handleSetCurrentPage(bridge, args)
  );

  // ============================================================
  // Export Tools
  // ============================================================

  // figma_export_node - Export a node as an image
  server.tool(
    'figma_export_node',
    'Export a node as an image (PNG, SVG, JPG, or PDF). Returns base64-encoded data.',
    {
      nodeId: z.string().describe('The node ID to export'),
      format: z.enum(['PNG', 'SVG', 'JPG', 'PDF']).optional().default('PNG').describe('Export format'),
      scale: z.number().optional().default(1).describe('Export scale (1 = 100%, 2 = 200%, etc.)')
    },
    async (args) => handleExportNode(bridge, args)
  );

  // ============================================================
  // Phase 2 Tools
  // ============================================================

  // figma_create_ellipse - Create an ellipse/circle
  server.tool(
    'figma_create_ellipse',
    'Create a new ellipse (circle/oval) in the Figma document. Use arcData for partial arcs or rings.',
    {
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      width: z.number().optional().default(100).describe('Width in pixels (diameter for circle)'),
      height: z.number().optional().default(100).describe('Height in pixels (same as width for circle)'),
      name: z.string().optional().default('Ellipse').describe('Node name'),
      fills: colorSchema.optional().describe('Fill color'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)'),
      arcData: z.object({
        startingAngle: z.number().min(0).max(6.28319).optional().describe('Starting angle in radians (0 = 3 o\'clock)'),
        endingAngle: z.number().min(0).max(6.28319).optional().describe('Ending angle in radians (2*PI = full circle)'),
        innerRadius: z.number().min(0).max(1).optional().describe('Inner radius ratio (0 = solid, 0.5 = 50% hole)')
      }).optional().describe('Arc data for partial ellipses or rings')
    },
    async (args) => handleCreateEllipse(bridge, args)
  );

  // figma_set_effects - Set effects (shadows, blurs)
  server.tool(
    'figma_set_effects',
    'Set effects (shadows, blurs) on a node. Replaces existing effects.',
    {
      nodeId: z.string().describe('The node ID to modify'),
      effects: z.array(z.union([
        z.object({
          type: z.enum(['DROP_SHADOW', 'INNER_SHADOW']).describe('Shadow type'),
          color: colorSchema.optional().describe('Shadow color'),
          offset: z.object({
            x: z.number().describe('Horizontal offset'),
            y: z.number().describe('Vertical offset')
          }).optional().describe('Shadow offset'),
          radius: z.number().min(0).optional().describe('Blur radius'),
          spread: z.number().optional().describe('Spread radius'),
          visible: z.boolean().optional().describe('Whether effect is visible'),
          blendMode: z.string().optional().describe('Blend mode')
        }),
        z.object({
          type: z.enum(['LAYER_BLUR', 'BACKGROUND_BLUR']).describe('Blur type'),
          radius: z.number().min(0).describe('Blur radius'),
          visible: z.boolean().optional().describe('Whether effect is visible')
        })
      ])).describe('Array of effects to apply')
    },
    async (args) => handleSetEffects(bridge, args)
  );

  // figma_set_auto_layout - Configure auto-layout
  server.tool(
    'figma_set_auto_layout',
    'Configure auto-layout on a frame. Enables responsive layouts with automatic spacing and alignment.',
    {
      nodeId: z.string().describe('The frame node ID to configure'),
      layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']).optional().describe('Layout direction: NONE (disable), HORIZONTAL (row), or VERTICAL (column)'),
      primaryAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional().describe('How the frame sizes along the primary axis'),
      counterAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional().describe('How the frame sizes along the counter axis'),
      primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional().describe('Alignment of children along primary axis'),
      counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional().describe('Alignment of children along counter axis'),
      paddingTop: z.number().min(0).optional().describe('Top padding in pixels'),
      paddingRight: z.number().min(0).optional().describe('Right padding in pixels'),
      paddingBottom: z.number().min(0).optional().describe('Bottom padding in pixels'),
      paddingLeft: z.number().min(0).optional().describe('Left padding in pixels'),
      itemSpacing: z.number().min(0).optional().describe('Space between items in pixels'),
      counterAxisSpacing: z.number().min(0).optional().describe('Space between rows when wrapped'),
      layoutWrap: z.enum(['NO_WRAP', 'WRAP']).optional().describe('Whether to wrap items to new rows/columns')
    },
    async (args) => handleSetAutoLayout(bridge, args)
  );

  // figma_get_local_styles - List local styles
  server.tool(
    'figma_get_local_styles',
    'List all local styles defined in the document (colors, text, effects, grids). TIP: Use figma_search_styles instead when looking for specific styles by name - it returns compact results and reduces token usage.',
    {
      type: z.enum(['PAINT', 'TEXT', 'EFFECT', 'GRID', 'ALL']).optional().default('ALL').describe('Filter by style type')
    },
    async (args) => handleGetLocalStyles(bridge, args)
  );

  // figma_apply_style - Apply a style to a node
  server.tool(
    'figma_apply_style',
    'Apply a local style to a node. Styles provide consistent, reusable design tokens.',
    {
      nodeId: z.string().describe('The node ID to apply the style to'),
      styleId: z.string().describe('The style ID to apply'),
      property: z.enum(['fills', 'strokes', 'text', 'effects', 'grid']).describe('Which property to apply the style to')
    },
    async (args) => handleApplyStyle(bridge, args)
  );

  // figma_create_component - Create a component
  server.tool(
    'figma_create_component',
    'Create a new component. Components are reusable design elements that can be instanced.',
    {
      fromNodeId: z.string().optional().describe('Convert an existing node to a component'),
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      width: z.number().optional().default(100).describe('Width in pixels'),
      height: z.number().optional().default(100).describe('Height in pixels'),
      name: z.string().optional().default('Component').describe('Component name'),
      fills: colorSchema.optional().describe('Fill color'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)'),
      description: z.string().optional().describe('Component description')
    },
    async (args) => handleCreateComponent(bridge, args)
  );

  // figma_create_instance - Create an instance of a component
  server.tool(
    'figma_create_instance',
    'Create an instance of a component. Instances inherit properties from their main component.',
    {
      componentId: z.string().describe('The component ID to create an instance of'),
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)'),
      name: z.string().optional().describe('Instance name (defaults to component name)')
    },
    async (args) => handleCreateInstance(bridge, args)
  );

  // ============================================================
  // Phase 3 Tools: Variables, Lines, Constraints
  // ============================================================

  // figma_get_local_variables - Get local variables
  // WARNING: Can return 25k+ tokens for large design systems. Prefer figma_search_variables when possible.
  server.tool(
    'figma_get_local_variables',
    'Get all local variables and variable collections from the Figma document. Returns variables with their types (COLOR, FLOAT, STRING, BOOLEAN), modes, and values. WARNING: Can return 25k+ tokens and may be truncated. Use figma_search_variables instead when looking for specific variables.',
    {
      type: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN', 'ALL']).optional().default('ALL').describe('Filter by variable type')
    },
    async (args) => handleGetLocalVariables(bridge, args)
  );

  // figma_search_variables - Search variables with filtering (optimized for reduced token usage)
  // PREFERRED: Use this instead of figma_get_local_variables for ~50x token reduction
  server.tool(
    'figma_search_variables',
    'Search for variables by name pattern. More efficient than get_local_variables - use this when looking for specific variables like "tailwind/orange/*" or "*primary*". Returns compact results to reduce token usage. PREFERRED over figma_get_local_variables for efficiency (~500 tokens vs 25k+).',
    {
      namePattern: z.string().optional().describe('Filter by name pattern with wildcards. Examples: "tailwind/orange/*", "*primary*", "spacing/*". Use * for any characters.'),
      nameContains: z.string().optional().describe('Simple filter: find variables where name contains this string (case-insensitive). Example: "orange" matches "tailwind/orange/500"'),
      type: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN', 'ALL']).optional().default('ALL').describe('Filter by variable type'),
      collectionName: z.string().optional().describe('Filter by collection name (exact match or partial)'),
      compact: z.boolean().optional().default(true).describe('Return minimal data (id, name, hex/value only). Set false for full metadata.'),
      limit: z.number().optional().default(50).describe('Maximum number of variables to return')
    },
    async (args) => handleSearchVariables(bridge, args)
  );

  // ============================================================
  // Smart Query Tools (token-efficient search)
  // ============================================================

  // figma_search_nodes - Search nodes by name within a scope
  server.tool(
    'figma_search_nodes',
    'Search for nodes by name within a scope. PREFERRED for finding specific frames, sections, or elements. Requires parentId to scope search. Returns compact results (~50 tokens/node vs ~500 for full).',
    {
      parentId: z.string().describe('Scope to search (page/frame/section ID). REQUIRED to prevent runaway queries.'),
      nameContains: z.string().optional().describe('Case-insensitive substring match. Example: "color scale" matches "Color Scale Section"'),
      namePattern: z.string().optional().describe('Glob pattern with wildcards. Examples: "*button*", "Header/*"'),
      types: z.array(z.string()).optional().describe('Filter by node types: FRAME, TEXT, SECTION, COMPONENT, INSTANCE, GROUP, etc.'),
      maxDepth: z.number().optional().default(-1).describe('How deep to search (-1 = unlimited, 1 = immediate children only)'),
      compact: z.boolean().optional().default(true).describe('Return minimal data (id, name, type, parentId, childCount)'),
      limit: z.number().optional().default(50).describe('Maximum number of results')
    },
    async (args) => handleSearchNodes(bridge, args)
  );

  // figma_search_components - Search local components by name
  server.tool(
    'figma_search_components',
    'Search local components by name. Use when looking for specific components like "Button", "Header", etc. Returns compact results with component metadata.',
    {
      nameContains: z.string().optional().describe('Case-insensitive substring match'),
      namePattern: z.string().optional().describe('Glob pattern with wildcards'),
      includeVariants: z.boolean().optional().default(false).describe('Include individual variants from component sets'),
      compact: z.boolean().optional().default(true).describe('Return minimal data'),
      limit: z.number().optional().default(50).describe('Maximum number of results')
    },
    async (args) => handleSearchComponents(bridge, args)
  );

  // figma_search_styles - Search local styles by name
  server.tool(
    'figma_search_styles',
    'Search local styles by name. More efficient than figma_get_local_styles when looking for specific styles.',
    {
      nameContains: z.string().optional().describe('Case-insensitive substring match'),
      type: z.enum(['PAINT', 'TEXT', 'EFFECT', 'GRID', 'ALL']).optional().default('ALL').describe('Filter by style type'),
      compact: z.boolean().optional().default(true).describe('Return minimal data'),
      limit: z.number().optional().default(50).describe('Maximum number of results')
    },
    async (args) => handleSearchStyles(bridge, args)
  );

  // figma_get_children - Get immediate children of a node
  server.tool(
    'figma_get_children',
    'Get immediate children of a node. Use for browsing hierarchy one level at a time. More efficient than figma_get_nodes for exploring structure.',
    {
      parentId: z.string().describe('Node ID to get children of. REQUIRED.'),
      compact: z.boolean().optional().default(true).describe('Return minimal data')
    },
    async (args) => handleGetChildren(bridge, args)
  );

  // figma_set_variable - Set variable value or bind to node
  server.tool(
    'figma_set_variable',
    'Set the value of an existing variable for a specific mode, or bind a variable to a node property.',
    {
      variableId: z.string().describe('The variable ID to set or bind'),
      modeId: z.string().optional().describe('Mode ID to set value for (required when setting value)'),
      value: z.union([
        z.number(),
        z.string(),
        z.boolean(),
        z.object({
          r: z.number().min(0).max(1).describe('Red (0-1)'),
          g: z.number().min(0).max(1).describe('Green (0-1)'),
          b: z.number().min(0).max(1).describe('Blue (0-1)'),
          a: z.number().min(0).max(1).optional().describe('Alpha (0-1)')
        })
      ]).optional().describe('The value to set (number, string, boolean, or color object)'),
      nodeId: z.string().optional().describe('Node ID to bind variable to (for binding operation)'),
      field: z.string().optional().describe('Node field to bind to (e.g., "opacity", "cornerRadius", "fills", "strokes")'),
      paintIndex: z.number().optional().default(0).describe('Paint array index when binding to fills or strokes')
    },
    async (args) => handleSetVariable(bridge, args)
  );

  // figma_create_line - Create a line
  server.tool(
    'figma_create_line',
    'Create a line in Figma. Lines are one-dimensional objects defined by length and rotation.',
    {
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      length: z.number().optional().default(100).describe('Line length in pixels'),
      rotation: z.number().optional().default(0).describe('Line rotation in degrees (0 = horizontal)'),
      name: z.string().optional().default('Line').describe('Node name'),
      strokeWeight: z.number().optional().default(1).describe('Stroke weight in pixels'),
      strokes: colorSchema.optional().describe('Stroke color'),
      strokeCap: z.enum(['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL']).optional().default('NONE').describe('Stroke cap style (ARROW_LINES/ARROW_EQUILATERAL for arrows)'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)')
    },
    async (args) => handleCreateLine(bridge, args)
  );

  // figma_set_constraints - Set resize constraints
  server.tool(
    'figma_set_constraints',
    'Set resize constraints on a node. Constraints control how a node resizes when its parent frame resizes. Only works on nodes inside frames (not auto-layout frames).',
    {
      nodeId: z.string().describe('The node ID to set constraints on'),
      horizontal: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']).optional().describe('Horizontal constraint: MIN (left), CENTER, MAX (right), STRETCH (left+right), SCALE (proportional)'),
      vertical: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']).optional().describe('Vertical constraint: MIN (top), CENTER, MAX (bottom), STRETCH (top+bottom), SCALE (proportional)')
    },
    async (args) => handleSetConstraints(bridge, args)
  );

  // ============================================================
  // Phase 4 Tools: Polygons, Boolean Operations, Viewport, Blend Mode, Detach
  // ============================================================

  // figma_create_polygon - Create a polygon or star
  server.tool(
    'figma_create_polygon',
    'Create a polygon (triangle, pentagon, hexagon, etc.) or star shape. Set innerRadius (0-1) to create a star with spiky points.',
    {
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      width: z.number().optional().default(100).describe('Width in pixels'),
      height: z.number().optional().default(100).describe('Height in pixels'),
      pointCount: z.number().min(3).optional().default(5).describe('Number of sides (polygon) or points (star). Minimum 3.'),
      innerRadius: z.number().min(0).max(1).optional().describe('Inner radius ratio for stars (0-1). 0 = very spiky, 1 = polygon. Omit for regular polygon.'),
      name: z.string().optional().describe('Node name'),
      fills: colorSchema.optional().describe('Fill color'),
      strokes: colorSchema.optional().describe('Stroke color'),
      strokeWeight: z.number().optional().describe('Stroke weight in pixels'),
      cornerRadius: z.number().optional().describe('Corner radius for vertices'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)')
    },
    async (args) => handleCreatePolygon(bridge, args)
  );

  // figma_boolean_operation - Perform boolean operations on shapes
  server.tool(
    'figma_boolean_operation',
    'Combine multiple shapes using boolean operations (union, subtract, intersect, exclude) or flatten them into a single vector.',
    {
      operation: z.enum(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE', 'FLATTEN']).describe('Boolean operation type: UNION (combine), SUBTRACT (cut), INTERSECT (overlap only), EXCLUDE (non-overlap only), FLATTEN (destructive vector)'),
      nodeIds: z.array(z.string()).min(2).describe('Array of node IDs to combine (minimum 2 nodes)'),
      name: z.string().optional().describe('Name for the resulting node')
    },
    async (args) => handleBooleanOperation(bridge, args)
  );

  // figma_zoom_to_node - Zoom viewport to focus on specific nodes
  server.tool(
    'figma_zoom_to_node',
    'Scroll and zoom the Figma viewport to focus on specific nodes. Automatically calculates zoom level to fit all specified nodes.',
    {
      nodeIds: z.array(z.string()).min(1).describe('Array of node IDs to zoom to')
    },
    async (args) => handleZoomToNode(bridge, args)
  );

  // figma_set_blend_mode - Set blend mode on a node
  server.tool(
    'figma_set_blend_mode',
    'Set the blend mode (layer blending) of a node. Controls how the node visually blends with layers below it.',
    {
      nodeId: z.string().describe('The node ID to modify'),
      blendMode: z.enum([
        'PASS_THROUGH', 'NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN',
        'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE', 'OVERLAY', 'SOFT_LIGHT',
        'HARD_LIGHT', 'DIFFERENCE', 'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY'
      ]).describe('Blend mode: NORMAL (default), MULTIPLY (darken), SCREEN (lighten), OVERLAY (contrast), etc.')
    },
    async (args) => handleSetBlendMode(bridge, args)
  );

  // figma_detach_instance - Detach instance from component
  server.tool(
    'figma_detach_instance',
    'Detach a component instance, converting it to a regular frame. Preserves overrides but severs the link to the main component.',
    {
      nodeId: z.string().describe('The instance node ID to detach')
    },
    async (args) => handleDetachInstance(bridge, args)
  );

  // ============================================================
  // Phase 5 Tools: Layout Align, Vector, Rename, Reorder
  // ============================================================

  // figma_set_layout_align - Set layout alignment for auto-layout children
  server.tool(
    'figma_set_layout_align',
    'Set how a child behaves within an auto-layout frame. Controls individual alignment (STRETCH), growth (fill container), and absolute positioning.',
    {
      nodeId: z.string().describe('The child node ID to modify'),
      layoutAlign: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'INHERIT']).optional().describe('Counter-axis alignment: STRETCH to fill width/height'),
      layoutGrow: z.number().min(0).max(1).optional().describe('Primary-axis growth: 0 = fixed size, 1 = fill available space'),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional().describe('AUTO = follow auto-layout, ABSOLUTE = manually positioned')
    },
    async (args) => handleSetLayoutAlign(bridge, args)
  );

  // figma_create_vector - Create a custom vector path
  server.tool(
    'figma_create_vector',
    'Create a custom vector shape using SVG-style path data. Supports M (move), L (line), Q (quadratic curve), C (cubic bezier), Z (close).',
    {
      x: z.number().optional().default(0).describe('X position'),
      y: z.number().optional().default(0).describe('Y position'),
      data: z.string().describe('SVG path string (e.g., "M 0 100 L 100 100 L 50 0 Z" for triangle)'),
      windingRule: z.enum(['NONZERO', 'EVENODD', 'NONE']).optional().default('NONZERO').describe('Fill rule: NONZERO (solid), EVENODD (holes), NONE (outline only)'),
      name: z.string().optional().default('Vector').describe('Node name'),
      fills: colorSchema.optional().describe('Fill color'),
      strokes: colorSchema.optional().describe('Stroke color'),
      strokeWeight: z.number().optional().describe('Stroke weight in pixels'),
      parentId: z.string().optional().describe('Parent node ID (defaults to current page)')
    },
    async (args) => handleCreateVector(bridge, args)
  );

  // figma_rename_node - Rename nodes
  server.tool(
    'figma_rename_node',
    'Rename one or more nodes. For batch renaming, all nodes get the same name.',
    {
      nodeId: z.string().optional().describe('Single node ID to rename'),
      nodeIds: z.array(z.string()).optional().describe('Array of node IDs to rename (batch)'),
      name: z.string().describe('The new name for the node(s)')
    },
    async (args) => handleRenameNode(bridge, args)
  );

  // figma_reorder_node - Change z-order of a node
  server.tool(
    'figma_reorder_node',
    'Change the z-order (layer order) of a node. Bring to front, send to back, or move to a specific index.',
    {
      nodeId: z.string().describe('The node ID to reorder'),
      position: z.union([
        z.literal('front'),
        z.literal('back'),
        z.number()
      ]).describe('Position: "front" (top), "back" (bottom), or index number')
    },
    async (args) => handleReorderNode(bridge, args)
  );

  // ============================================================
  // Design System Creation Tools
  // ============================================================

  // figma_set_text_style - Set font properties on existing text
  server.tool(
    'figma_set_text_style',
    'Set font properties on a text node. Changes apply to entire text (uniform style).',
    {
      nodeId: z.string().describe('Text node ID'),
      fontSize: z.number().optional().describe('Font size in pixels'),
      fontFamily: z.string().optional().describe('Font family (e.g., "Inter")'),
      fontStyle: z.string().optional().describe('Font style (e.g., "Bold", "Regular")'),
      textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional().describe('Text case transformation'),
      textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional().describe('Text decoration'),
      lineHeight: z.union([
        z.object({ unit: z.literal('AUTO') }),
        z.object({ unit: z.literal('PIXELS'), value: z.number() }),
        z.object({ unit: z.literal('PERCENT'), value: z.number() })
      ]).optional().describe('Line height (AUTO, or PIXELS/PERCENT with value)'),
      letterSpacing: z.union([
        z.object({ unit: z.literal('PIXELS'), value: z.number() }),
        z.object({ unit: z.literal('PERCENT'), value: z.number() })
      ]).optional().describe('Letter spacing (PIXELS or PERCENT with value)'),
      textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional().describe('Horizontal text alignment'),
      textAlignVertical: z.enum(['TOP', 'CENTER', 'BOTTOM']).optional().describe('Vertical text alignment')
    },
    async (args) => handleSetTextStyle(bridge, args)
  );

  // figma_create_paint_style - Create a local paint style
  server.tool(
    'figma_create_paint_style',
    'Create a new local paint style (color style).',
    {
      name: z.string().describe('Style name (use "/" for folders, e.g., "Brand/Primary")'),
      fills: colorSchema.describe('Fill color - use { color: "#RRGGBB" } for simple colors'),
      description: z.string().optional().describe('Style description')
    },
    async (args) => handleCreatePaintStyle(bridge, args)
  );

  // figma_create_text_style - Create a local text style
  server.tool(
    'figma_create_text_style',
    'Create a new local text style.',
    {
      name: z.string().describe('Style name (use "/" for folders)'),
      fontFamily: z.string().optional().default('Inter').describe('Font family'),
      fontStyle: z.string().optional().default('Regular').describe('Font style (Regular, Bold, etc.)'),
      fontSize: z.number().optional().default(16).describe('Font size in pixels'),
      lineHeight: z.union([
        z.object({ unit: z.literal('AUTO') }),
        z.object({ unit: z.literal('PIXELS'), value: z.number() }),
        z.object({ unit: z.literal('PERCENT'), value: z.number() })
      ]).optional().describe('Line height'),
      letterSpacing: z.union([
        z.object({ unit: z.literal('PIXELS'), value: z.number() }),
        z.object({ unit: z.literal('PERCENT'), value: z.number() })
      ]).optional().describe('Letter spacing'),
      textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional().describe('Text case'),
      textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional().describe('Text decoration'),
      description: z.string().optional().describe('Style description')
    },
    async (args) => handleCreateTextStyle(bridge, args)
  );

  // figma_create_variable_collection - Create a variable collection
  server.tool(
    'figma_create_variable_collection',
    'Create a new variable collection to organize variables.',
    {
      name: z.string().describe('Collection name'),
      modes: z.array(z.string()).optional().describe('Mode names (defaults to ["Mode 1"])')
    },
    async (args) => handleCreateVariableCollection(bridge, args)
  );

  // figma_create_variable - Create a variable
  server.tool(
    'figma_create_variable',
    'Create a new variable in a collection.',
    {
      collectionId: z.string().describe('Variable collection ID'),
      name: z.string().describe('Variable name (use "/" for groups, e.g., "colors/primary")'),
      type: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']).describe('Variable type'),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number().optional() }),
        z.object({ color: z.string() })
      ]).optional().describe('Initial value for default mode'),
      aliasOf: z.string().optional().describe('Variable ID to alias (instead of direct value)'),
      description: z.string().optional().describe('Variable description'),
      scopes: z.array(z.enum([
        'ALL_SCOPES', 'TEXT_CONTENT', 'CORNER_RADIUS', 'WIDTH_HEIGHT',
        'GAP', 'ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR',
        'STROKE_FLOAT', 'EFFECT_FLOAT', 'EFFECT_COLOR', 'OPACITY', 'FONT_FAMILY',
        'FONT_STYLE', 'FONT_WEIGHT', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING',
        'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT'
      ])).optional().describe('Where this variable can be used')
    },
    async (args) => handleCreateVariable(bridge, args)
  );

  // figma_rename_variable - Rename an existing variable
  server.tool(
    'figma_rename_variable',
    'Rename an existing variable. Use "/" in the name to organize into groups (e.g., "font weight/heading/h1").',
    {
      variableId: z.string().describe('The variable ID to rename'),
      name: z.string().describe('The new name for the variable (use "/" for groups)')
    },
    async (args) => handleRenameVariable(bridge, args)
  );

  // figma_delete_variables - Delete one or more variables
  server.tool(
    'figma_delete_variables',
    'Delete one or more variables from the document. Use with caution - this cannot be undone.',
    {
      variableIds: z.array(z.string()).describe('Array of variable IDs to delete')
    },
    async (args) => handleDeleteVariables(bridge, args)
  );

  // figma_delete_variable_collection - Delete a variable collection
  server.tool(
    'figma_delete_variable_collection',
    'Delete a variable collection and all its variables. Use with caution - this cannot be undone.',
    {
      collectionId: z.string().describe('The collection ID to delete')
    },
    async (args) => handleDeleteVariableCollection(bridge, args)
  );

  // figma_rename_variable_collection - Rename a variable collection
  server.tool(
    'figma_rename_variable_collection',
    'Rename a variable collection.',
    {
      collectionId: z.string().describe('The collection ID to rename'),
      name: z.string().describe('The new name for the collection')
    },
    async (args) => handleRenameVariableCollection(bridge, args)
  );

  // figma_rename_mode - Rename a mode in a collection
  server.tool(
    'figma_rename_mode',
    'Rename a mode in a variable collection (e.g., "Mode 1" to "dark").',
    {
      collectionId: z.string().describe('The collection ID containing the mode'),
      modeId: z.string().describe('The mode ID to rename'),
      name: z.string().describe('The new name for the mode')
    },
    async (args) => handleRenameMode(bridge, args)
  );

  // figma_add_mode - Add a mode to a collection
  server.tool(
    'figma_add_mode',
    'Add a new mode to a variable collection.',
    {
      collectionId: z.string().describe('The collection ID to add mode to'),
      name: z.string().describe('Name for the new mode')
    },
    async (args) => handleAddMode(bridge, args)
  );

  // figma_delete_mode - Delete a mode from a collection
  server.tool(
    'figma_delete_mode',
    'Delete a mode from a variable collection. Cannot delete the last mode.',
    {
      collectionId: z.string().describe('The collection ID containing the mode'),
      modeId: z.string().describe('The mode ID to delete')
    },
    async (args) => handleDeleteMode(bridge, args)
  );

  // figma_unbind_variable - Remove variable binding from a node
  server.tool(
    'figma_unbind_variable',
    'Remove a variable binding from a node property.',
    {
      nodeId: z.string().describe('The node ID to unbind from'),
      field: z.string().describe('The field to unbind (fills, strokes, opacity, cornerRadius, etc.)'),
      paintIndex: z.number().optional().default(0).describe('Paint array index for fills/strokes')
    },
    async (args) => handleUnbindVariable(bridge, args)
  );

  // ============================================================
  // Page Management Tools
  // ============================================================

  // figma_create_page - Create a new page
  server.tool(
    'figma_create_page',
    'Create a new page in the Figma document. Returns the created page.',
    {
      name: z.string().describe('Name for the new page'),
      index: z.number().optional().describe('Position in the page list (0 = first). Defaults to end.')
    },
    async (args) => handleCreatePage(bridge, args)
  );

  // figma_rename_page - Rename a page
  server.tool(
    'figma_rename_page',
    'Rename an existing page in the Figma document.',
    {
      pageId: z.string().describe('The page ID to rename'),
      name: z.string().describe('The new name for the page')
    },
    async (args) => handleRenamePage(bridge, args)
  );

  // figma_delete_page - Delete a page
  server.tool(
    'figma_delete_page',
    'Delete a page from the Figma document. Cannot delete the last remaining page.',
    {
      pageId: z.string().describe('The page ID to delete')
    },
    async (args) => handleDeletePage(bridge, args)
  );

  // figma_reorder_page - Reorder a page
  server.tool(
    'figma_reorder_page',
    'Change the position of a page in the page list.',
    {
      pageId: z.string().describe('The page ID to reorder'),
      index: z.number().describe('New position in the page list (0 = first)')
    },
    async (args) => handleReorderPage(bridge, args)
  );

  // ============================================================
  // Node Structure Tools
  // ============================================================

  // figma_reparent_nodes - Move nodes to a different parent
  server.tool(
    'figma_reparent_nodes',
    'Move nodes to a different parent container. Useful for reorganizing the layer hierarchy.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to move'),
      newParentId: z.string().describe('The new parent node ID (must be a frame, group, or page)'),
      index: z.number().optional().describe('Position within the new parent (0 = bottom/back). Defaults to top/front.')
    },
    async (args) => handleReparentNodes(bridge, args)
  );

  // figma_move_to_page - Move nodes to a different page
  server.tool(
    'figma_move_to_page',
    'Move nodes from their current page to a different page.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to move'),
      targetPageId: z.string().describe('The destination page ID'),
      x: z.number().optional().describe('X position on the target page'),
      y: z.number().optional().describe('Y position on the target page')
    },
    async (args) => handleMoveToPage(bridge, args)
  );

  // ============================================================
  // Component Instance Tools
  // ============================================================

  // figma_swap_instance - Swap instance to different component
  server.tool(
    'figma_swap_instance',
    'Swap a component instance to use a different component. Preserves position and size.',
    {
      instanceId: z.string().describe('The instance node ID to swap'),
      newComponentId: z.string().describe('The component ID to swap to')
    },
    async (args) => handleSwapInstance(bridge, args)
  );

  // ============================================================
  // Additional Tools
  // ============================================================

  // figma_duplicate_page - Clone an entire page
  server.tool(
    'figma_duplicate_page',
    'Clone an entire page including all its contents. The new page is inserted after the original.',
    {
      pageId: z.string().describe('The page ID to duplicate'),
      name: z.string().optional().describe('Name for the new page (defaults to "original name + copy")')
    },
    async (args) => handleDuplicatePage(bridge, args)
  );

  // figma_set_rotation - Set rotation on nodes
  server.tool(
    'figma_set_rotation',
    'Set the rotation (in degrees) of one or more nodes. Rotation is around the center point.',
    {
      nodeIds: z.array(z.string()).describe('Array of node IDs to rotate'),
      rotation: z.number().min(-180).max(180).describe('Rotation in degrees (-180 to 180)')
    },
    async (args) => handleSetRotation(bridge, args)
  );

  // figma_set_layout_grids - Set layout grids on a frame
  server.tool(
    'figma_set_layout_grids',
    'Set layout grids on a frame. Grids help with alignment and spacing. Pass an empty array to remove all grids.',
    {
      nodeId: z.string().describe('The frame node ID to set grids on'),
      layoutGrids: z.array(z.object({
        pattern: z.enum(['COLUMNS', 'ROWS', 'GRID']).describe('Grid pattern type'),
        sectionSize: z.number().optional().describe('Size of each column/row/cell in pixels'),
        visible: z.boolean().optional().default(true).describe('Whether grid is visible'),
        color: z.object({
          r: z.number().min(0).max(1).describe('Red (0-1)'),
          g: z.number().min(0).max(1).describe('Green (0-1)'),
          b: z.number().min(0).max(1).describe('Blue (0-1)'),
          a: z.number().min(0).max(1).optional().default(0.1).describe('Alpha (0-1)')
        }).optional().describe('Grid color with alpha'),
        alignment: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH']).optional().describe('Column/row alignment (for COLUMNS/ROWS pattern)'),
        gutterSize: z.number().optional().describe('Gutter size between columns/rows in pixels'),
        offset: z.number().optional().describe('Offset from edge in pixels'),
        count: z.number().optional().describe('Number of columns/rows (use large number like 100 for auto)')
      })).describe('Array of layout grid configurations')
    },
    async (args) => handleSetLayoutGrids(bridge, args)
  );
}
