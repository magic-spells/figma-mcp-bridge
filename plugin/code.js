/**
 * Claude Figma Bridge Plugin
 *
 * Main thread handles Figma API calls.
 * UI thread (ui.html) handles WebSocket connection.
 */

// Show UI (handles WebSocket connection)
figma.showUI(__html__, { visible: true, width: 200, height: 80 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get_handshake_info') {
    // Send document info for handshake
    figma.ui.postMessage({
      type: 'handshake_info',
      payload: {
        pluginVersion: '0.1.0',
        protocolVersion: '1',
        fileId: figma.fileKey || 'unknown',
        fileName: figma.root.name,
        currentPageId: figma.currentPage.id,
        currentPageName: figma.currentPage.name,
        editorType: figma.editorType
      }
    });
  } else if (msg.type === 'command') {
    // Handle command from server
    const { requestId, command, payload } = msg;
    try {
      const result = await handleCommand(command, payload);
      // Sanitize entire result through safeClone to strip Symbols before postMessage
      figma.ui.postMessage({
        type: 'command_response',
        requestId,
        payload: safeClone(result)
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'command_response',
        requestId,
        payload: {
          error: {
            code: 'OPERATION_FAILED',
            message: error.message
          }
        }
      });
    }
  }
};

// ============================================================
// Command Handler
// ============================================================

async function handleCommand(command, payload) {
  switch (command) {
    case 'ping':
      return { ok: true, timestamp: Date.now() };

    case 'get_context':
      return getContext();

    case 'list_pages':
      return listPages();

    case 'get_nodes':
      return await getNodes(payload);
    case 'set_fills':
      return await setFills(payload);
    case 'set_strokes':
      return await setStrokes(payload);
    case 'create_rectangle':
      return await createRectangle(payload);
    case 'set_text':
      return await setText(payload);
    case 'clone_nodes':
      return await cloneNodes(payload);
    case 'delete_nodes':
      return await deleteNodes(payload);
    case 'move_nodes':
      return await moveNodes(payload);
    case 'resize_nodes':
      return await resizeNodes(payload);
    case 'set_opacity':
      return await setOpacity(payload);
    case 'set_corner_radius':
      return await setCornerRadius(payload);
    case 'group_nodes':
      return await groupNodes(payload);
    case 'ungroup_nodes':
      return await ungroupNodes(payload);
    case 'create_frame':
      return await createFrame(payload);
    case 'create_text':
      return await createText(payload);
    case 'set_selection':
      return await setSelection(payload);
    case 'set_current_page':
      return await setCurrentPage(payload);
    case 'export_node':
      return await exportNode(payload);
    case 'create_ellipse':
      return await createEllipse(payload);
    case 'set_effects':
      return await setEffects(payload);
    case 'set_auto_layout':
      return await setAutoLayout(payload);
    case 'get_local_styles':
      return await getLocalStyles(payload);
    case 'apply_style':
      return await applyStyle(payload);
    case 'create_component':
      return await createComponent(payload);
    case 'create_instance':
      return await createInstance(payload);
    case 'get_local_variables':
      return await getLocalVariables(payload);
    case 'search_variables':
      return await searchVariables(payload);
    case 'search_nodes':
      return await searchNodes(payload);
    case 'search_components':
      return await searchComponents(payload);
    case 'search_styles':
      return await searchStyles(payload);
    case 'get_children':
      return await getChildren(payload);
    case 'set_variable':
      return await setVariable(payload);
    case 'create_line':
      return await createLine(payload);
    case 'set_constraints':
      return await setConstraints(payload);
    case 'create_polygon':
      return await createPolygon(payload);
    case 'boolean_operation':
      return await booleanOperation(payload);
    case 'zoom_to_node':
      return await zoomToNode(payload);
    case 'set_blend_mode':
      return await setBlendMode(payload);
    case 'detach_instance':
      return await detachInstance(payload);
    case 'set_layout_align':
      return await setLayoutAlign(payload);
    case 'create_vector':
      return await createVector(payload);
    case 'rename_node':
      return await renameNode(payload);
    case 'reorder_node':
      return await reorderNode(payload);
    case 'set_text_style':
      return await setTextStyle(payload);
    case 'create_paint_style':
      return await createPaintStyle(payload);
    case 'create_text_style':
      return await createTextStyle(payload);
    case 'create_variable_collection':
      return await createVariableCollection(payload);
    case 'create_variable':
      return await createVariable(payload);
    case 'rename_variable':
      return await renameVariable(payload);
    case 'delete_variables':
      return await deleteVariables(payload);
    case 'delete_variable_collection':
      return await deleteVariableCollection(payload);
    case 'rename_variable_collection':
      return await renameVariableCollection(payload);
    case 'rename_mode':
      return await renameMode(payload);
    case 'add_mode':
      return await addMode(payload);
    case 'delete_mode':
      return await deleteMode(payload);
    case 'unbind_variable':
      return await unbindVariable(payload);
    // Page Management commands
    case 'create_page':
      return await createPage(payload);
    case 'rename_page':
      return await renamePage(payload);
    case 'delete_page':
      return await deletePage(payload);
    case 'reorder_page':
      return await reorderPage(payload);
    // Node Structure commands
    case 'reparent_nodes':
      return await reparentNodes(payload);
    case 'move_to_page':
      return await moveToPage(payload);
    // Instance commands
    case 'swap_instance':
      return await swapInstance(payload);
    // Additional commands
    case 'duplicate_page':
      return await duplicatePage(payload);
    case 'set_rotation':
      return await setRotation(payload);
    case 'set_layout_grids':
      return await setLayoutGrids(payload);

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// ============================================================
// Command Implementations
// ============================================================

function getContext() {
  const selection = figma.currentPage.selection.map(node => serializeNode(node, 'minimal'));

  return {
    fileId: figma.fileKey || 'unknown',
    fileName: figma.root.name,
    currentPage: {
      id: figma.currentPage.id,
      name: figma.currentPage.name
    },
    selection,
    editorType: figma.editorType
  };
}

function listPages() {
  const pages = figma.root.children.map((page, index) => ({
    id: page.id,
    name: page.name,
    index,
    isCurrent: page.id === figma.currentPage.id
  }));

  return { pages };
}

async function getNodes({ nodeIds = [], depth }) {
  var nodes = [];
  var notFound = [];
  var serializeDepth = depth || 'full';

  for (var i = 0; i < nodeIds.length; i++) {
    var nodeId = nodeIds[i];
    var node = await figma.getNodeByIdAsync(nodeId);
    if (node) {
      nodes.push(serializeNode(node, serializeDepth));
    } else {
      notFound.push(nodeId);
    }
  }

  return { nodes, notFound };
}

// ============================================================
// Mutation Commands
// ============================================================

/**
 * Set fills on a node
 * @param {string} nodeId - Node ID
 * @param {Array|Object} fills - Fill array or shorthand { color: "#RRGGBB" } or { r, g, b }
 */
async function setFills({ nodeId, fills }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  if (!('fills' in node)) {
    throw new Error(`Node ${nodeId} does not support fills`);
  }

  // Convert shorthand to full fills array
  const fillsArray = normalizeFills(fills);
  node.fills = fillsArray;

  return {
    success: true,
    nodeId: node.id,
    fills: clone(node.fills)
  };
}

/**
 * Set strokes on a node
 * @param {string} nodeId - Node ID
 * @param {Array|Object} strokes - Stroke array or shorthand
 * @param {number} strokeWeight - Optional stroke weight
 */
async function setStrokes({ nodeId, strokes, strokeWeight }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  if (!('strokes' in node)) {
    throw new Error(`Node ${nodeId} does not support strokes`);
  }

  // Convert shorthand to full strokes array
  const strokesArray = normalizeFills(strokes); // Same format as fills
  node.strokes = strokesArray;

  if (strokeWeight !== undefined && 'strokeWeight' in node) {
    node.strokeWeight = strokeWeight;
  }

  return {
    success: true,
    nodeId: node.id,
    strokes: clone(node.strokes),
    strokeWeight: node.strokeWeight
  };
}

/**
 * Create a rectangle
 * @param {Object} params - { x, y, width, height, name, fills, parentId }
 */
async function createRectangle(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = 'Rectangle',
    fills,
    parentId
  } = params;

  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  rect.name = name;

  if (fills) {
    rect.fills = normalizeFills(fills);
  }

  // Add to parent if specified, otherwise add to current page
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(rect);
    }
  } else {
    figma.currentPage.appendChild(rect);
  }

  return {
    success: true,
    node: serializeNode(rect, 'full')
  };
}

/**
 * Set text content on a text node
 * @param {string} nodeId - Text node ID
 * @param {string} text - New text content
 */
async function setText({ nodeId, text }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  if (node.type !== 'TEXT') {
    throw new Error(`Node ${nodeId} is not a text node (type: ${node.type})`);
  }

  // Load fonts before changing text
  const fontName = node.fontName;
  if (fontName !== figma.mixed) {
    await figma.loadFontAsync(fontName);
  } else {
    // Mixed fonts - load all unique fonts
    const len = node.characters.length;
    const fontsToLoad = new Set();
    for (let i = 0; i < len; i++) {
      const font = node.getRangeFontName(i, i + 1);
      if (font !== figma.mixed) {
        fontsToLoad.add(JSON.stringify(font));
      }
    }
    for (const fontStr of fontsToLoad) {
      await figma.loadFontAsync(JSON.parse(fontStr));
    }
  }

  node.characters = text;

  return {
    success: true,
    nodeId: node.id,
    characters: node.characters
  };
}

/**
 * Clone nodes
 * @param {string[]} nodeIds - Array of node IDs to clone
 * @param {string} parentId - Optional parent to add clones to
 * @param {Object} offset - Optional { x, y } offset for clones
 */
async function cloneNodes({ nodeIds, parentId, offset = { x: 20, y: 20 } }) {
  const clonedNodes = [];
  const notFound = [];

  let parent = null;
  if (parentId) {
    parent = await figma.getNodeByIdAsync(parentId);
    if (!parent || !('appendChild' in parent)) {
      throw new Error(`Invalid parent: ${parentId}`);
    }
  }

  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    const cloned = node.clone();

    // Apply offset
    if ('x' in cloned) {
      cloned.x = (node.x || 0) + (offset.x || 20);
      cloned.y = (node.y || 0) + (offset.y || 20);
    }

    // Move to specified parent, or keep in original's parent
    const targetParent = parent || node.parent;
    if (targetParent && 'appendChild' in targetParent) {
      targetParent.appendChild(cloned);
    }

    clonedNodes.push(serializeNode(cloned, 'full'));
  }

  return {
    success: true,
    clonedNodes,
    notFound
  };
}

// ============================================================
// Node Manipulation Commands
// ============================================================

/**
 * Delete nodes
 * @param {string[]} nodeIds - Array of node IDs to delete
 */
async function deleteNodes({ nodeIds }) {
  const deletedIds = [];
  const notFound = [];

  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    // Can't delete pages or the document root
    if (node.type === 'PAGE' || node.type === 'DOCUMENT') {
      throw new Error(`Cannot delete node of type ${node.type}`);
    }

    node.remove();
    deletedIds.push(nodeId);
  }

  return {
    success: true,
    deletedCount: deletedIds.length,
    deletedIds,
    notFound
  };
}

/**
 * Move nodes to a new position
 * @param {string[]} nodeIds - Array of node IDs to move
 * @param {number} x - X position or offset
 * @param {number} y - Y position or offset
 * @param {boolean} relative - If true, x/y are offsets
 */
async function moveNodes({ nodeIds, x, y, relative = false }) {
  const movedNodes = [];
  const notFound = [];

  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    if (!('x' in node)) {
      throw new Error(`Node ${nodeId} does not support positioning`);
    }

    if (relative) {
      if (x !== undefined) node.x = node.x + x;
      if (y !== undefined) node.y = node.y + y;
    } else {
      if (x !== undefined) node.x = x;
      if (y !== undefined) node.y = y;
    }

    movedNodes.push(serializeNode(node, 'full'));
  }

  return {
    success: true,
    nodes: movedNodes,
    notFound
  };
}

/**
 * Resize nodes
 * @param {string[]} nodeIds - Array of node IDs to resize
 * @param {number} width - New width
 * @param {number} height - New height
 */
async function resizeNodes({ nodeIds, width, height }) {
  const resizedNodes = [];
  const notFound = [];

  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    if (!('resize' in node)) {
      throw new Error(`Node ${nodeId} does not support resizing`);
    }

    const newWidth = width !== undefined ? width : node.width;
    const newHeight = height !== undefined ? height : node.height;
    node.resize(newWidth, newHeight);

    resizedNodes.push(serializeNode(node, 'full'));
  }

  return {
    success: true,
    nodes: resizedNodes,
    notFound
  };
}

/**
 * Set node opacity
 * @param {string} nodeId - Node ID
 * @param {number} opacity - Opacity value (0-1)
 */
async function setOpacity({ nodeId, opacity }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  if (!('opacity' in node)) {
    throw new Error(`Node ${nodeId} does not support opacity`);
  }

  node.opacity = opacity;

  return {
    success: true,
    nodeId: node.id,
    opacity: node.opacity
  };
}

/**
 * Set corner radius
 * @param {string} nodeId - Node ID
 * @param {Object} options - { radius, topLeft, topRight, bottomLeft, bottomRight }
 */
async function setCornerRadius({ nodeId, radius, topLeft, topRight, bottomLeft, bottomRight }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  if (!('cornerRadius' in node)) {
    throw new Error(`Node ${nodeId} does not support corner radius`);
  }

  // If uniform radius provided, set it
  if (radius !== undefined) {
    node.cornerRadius = radius;
  }

  // If individual corners provided, set them (requires topLeftRadius etc to exist)
  if ('topLeftRadius' in node) {
    if (topLeft !== undefined) node.topLeftRadius = topLeft;
    if (topRight !== undefined) node.topRightRadius = topRight;
    if (bottomLeft !== undefined) node.bottomLeftRadius = bottomLeft;
    if (bottomRight !== undefined) node.bottomRightRadius = bottomRight;
  }

  return {
    success: true,
    nodeId: node.id,
    cornerRadius: node.cornerRadius,
    topLeftRadius: 'topLeftRadius' in node ? node.topLeftRadius : undefined,
    topRightRadius: 'topRightRadius' in node ? node.topRightRadius : undefined,
    bottomLeftRadius: 'bottomLeftRadius' in node ? node.bottomLeftRadius : undefined,
    bottomRightRadius: 'bottomRightRadius' in node ? node.bottomRightRadius : undefined
  };
}

/**
 * Group nodes together
 * @param {string[]} nodeIds - Array of node IDs to group
 * @param {string} name - Name for the group
 */
async function groupNodes({ nodeIds, name = 'Group' }) {
  if (nodeIds.length < 1) {
    throw new Error('At least one node is required to create a group');
  }

  const nodes = [];
  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    nodes.push(node);
  }

  // Find common parent - use first node's parent
  const parent = nodes[0].parent;
  if (!parent) {
    throw new Error('Cannot group nodes without a parent');
  }

  // Verify all nodes have the same parent
  for (const node of nodes) {
    if (node.parent !== parent) {
      throw new Error('All nodes must have the same parent to be grouped');
    }
  }

  // Create the group
  const group = figma.group(nodes, parent);
  group.name = name;

  return {
    success: true,
    group: serializeNode(group, 'full')
  };
}

/**
 * Ungroup nodes
 * @param {string[]} nodeIds - Array of group node IDs to ungroup
 */
async function ungroupNodes({ nodeIds }) {
  const ungroupedNodes = [];
  const notFound = [];

  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    if (node.type !== 'GROUP') {
      throw new Error(`Node ${nodeId} is not a group (type: ${node.type})`);
    }

    // Get children before ungrouping
    const children = [...node.children];

    // Ungroup
    figma.ungroup(node);

    // Serialize the released children
    for (const child of children) {
      ungroupedNodes.push(serializeNode(child, 'full'));
    }
  }

  return {
    success: true,
    ungroupedNodes,
    notFound
  };
}

// ============================================================
// Creation Commands
// ============================================================

/**
 * Create a frame
 * @param {Object} params - { x, y, width, height, name, fills, parentId }
 */
async function createFrame(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = 'Frame',
    fills,
    parentId
  } = params;

  const frame = figma.createFrame();
  frame.x = x;
  frame.y = y;
  frame.resize(width, height);
  frame.name = name;

  if (fills) {
    frame.fills = normalizeFills(fills);
  }

  // Add to parent if specified, otherwise add to current page
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(frame);
    }
  } else {
    figma.currentPage.appendChild(frame);
  }

  return {
    success: true,
    node: serializeNode(frame, 'full')
  };
}

/**
 * Create a text node
 * @param {Object} params - { x, y, text, fontSize, fontFamily, fontStyle, fills, name, parentId }
 */
async function createText(params) {
  const {
    x = 0,
    y = 0,
    text = 'Text',
    fontSize = 16,
    fontFamily = 'Inter',
    fontStyle = 'Regular',
    fills,
    name = 'Text',
    parentId
  } = params;

  const textNode = figma.createText();

  // Load font before setting properties
  await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

  textNode.x = x;
  textNode.y = y;
  textNode.name = name;
  textNode.fontName = { family: fontFamily, style: fontStyle };
  textNode.fontSize = fontSize;
  textNode.characters = text;

  if (fills) {
    textNode.fills = normalizeFills(fills);
  }

  // Add to parent if specified, otherwise add to current page
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(textNode);
    }
  } else {
    figma.currentPage.appendChild(textNode);
  }

  return {
    success: true,
    node: serializeNode(textNode, 'full')
  };
}

// ============================================================
// Navigation Commands
// ============================================================

/**
 * Set the current selection
 * @param {string[]} nodeIds - Array of node IDs to select
 */
async function setSelection({ nodeIds }) {
  const nodes = [];
  const notFound = [];

  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node) {
      nodes.push(node);
    } else {
      notFound.push(nodeId);
    }
  }

  // Set selection on current page
  figma.currentPage.selection = nodes;

  return {
    success: true,
    selectedCount: nodes.length,
    selectedIds: nodes.map(n => n.id),
    notFound
  };
}

/**
 * Set the current page
 * @param {string} pageId - The page ID to switch to
 */
async function setCurrentPage({ pageId }) {
  const page = await figma.getNodeByIdAsync(pageId);

  if (!page) {
    throw new Error(`Page not found: ${pageId}`);
  }

  if (page.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a page (type: ${page.type})`);
  }

  await figma.setCurrentPageAsync(page);

  return {
    success: true,
    currentPage: {
      id: page.id,
      name: page.name
    }
  };
}

// ============================================================
// Export Commands
// ============================================================

/**
 * Export a node as an image
 * @param {string} nodeId - Node ID to export
 * @param {string} format - Export format (PNG, SVG, JPG, PDF)
 * @param {number} scale - Export scale
 */
async function exportNode({ nodeId, format = 'PNG', scale = 1 }) {
  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  if (!('exportAsync' in node)) {
    throw new Error(`Node ${nodeId} does not support export`);
  }

  const settings = {
    format: format,
    constraint: { type: 'SCALE', value: scale }
  };

  const bytes = await node.exportAsync(settings);

  // Convert Uint8Array to base64
  const base64 = figma.base64Encode(bytes);

  return {
    success: true,
    nodeId: node.id,
    format: format,
    scale: scale,
    size: bytes.length,
    data: base64
  };
}

// ============================================================
// Phase 2 Commands
// ============================================================

/**
 * Create an ellipse
 * @param {Object} params - { x, y, width, height, name, fills, parentId, arcData }
 */
async function createEllipse(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = 'Ellipse',
    fills,
    parentId,
    arcData
  } = params;

  const ellipse = figma.createEllipse();
  ellipse.x = x;
  ellipse.y = y;
  ellipse.resize(width, height);
  ellipse.name = name;

  if (fills) {
    ellipse.fills = normalizeFills(fills);
  }

  if (arcData) {
    ellipse.arcData = {
      startingAngle: arcData.startingAngle !== undefined ? arcData.startingAngle : 0,
      endingAngle: arcData.endingAngle !== undefined ? arcData.endingAngle : Math.PI * 2,
      innerRadius: arcData.innerRadius !== undefined ? arcData.innerRadius : 0
    };
  }

  // Add to parent if specified, otherwise add to current page
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(ellipse);
    }
  } else {
    figma.currentPage.appendChild(ellipse);
  }

  return {
    success: true,
    node: serializeNode(ellipse, 'full')
  };
}

/**
 * Set effects on a node
 * @param {string} nodeId - Node ID
 * @param {Array} effects - Array of effect objects
 */
async function setEffects({ nodeId, effects }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  if (!('effects' in node)) {
    throw new Error(`Node ${nodeId} does not support effects`);
  }

  // Normalize effects array
  const normalizedEffects = effects.map(effect => normalizeEffect(effect));
  node.effects = normalizedEffects;

  return {
    success: true,
    nodeId: node.id,
    effects: clone(node.effects)
  };
}

/**
 * Set auto-layout on a frame
 * @param {Object} params - Auto-layout parameters
 */
async function setAutoLayout(params) {
  const {
    nodeId,
    layoutMode,
    primaryAxisSizingMode,
    counterAxisSizingMode,
    primaryAxisAlignItems,
    counterAxisAlignItems,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    itemSpacing,
    counterAxisSpacing,
    layoutWrap
  } = params;

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // Only frames, components, and component sets support auto-layout
  if (!('layoutMode' in node)) {
    throw new Error(`Node ${nodeId} (${node.type}) does not support auto-layout. Only FRAME, COMPONENT, and COMPONENT_SET types are supported.`);
  }

  // Apply layout mode first (required to enable other properties)
  if (layoutMode !== undefined) {
    node.layoutMode = layoutMode;
  }

  // Only set other properties if auto-layout is enabled
  if (node.layoutMode !== 'NONE') {
    if (primaryAxisSizingMode !== undefined) node.primaryAxisSizingMode = primaryAxisSizingMode;
    if (counterAxisSizingMode !== undefined) node.counterAxisSizingMode = counterAxisSizingMode;
    if (primaryAxisAlignItems !== undefined) node.primaryAxisAlignItems = primaryAxisAlignItems;
    if (counterAxisAlignItems !== undefined) node.counterAxisAlignItems = counterAxisAlignItems;
    if (paddingTop !== undefined) node.paddingTop = paddingTop;
    if (paddingRight !== undefined) node.paddingRight = paddingRight;
    if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
    if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;
    if (itemSpacing !== undefined) node.itemSpacing = itemSpacing;
    if (layoutWrap !== undefined) node.layoutWrap = layoutWrap;
    if (counterAxisSpacing !== undefined && node.layoutWrap === 'WRAP') {
      node.counterAxisSpacing = counterAxisSpacing;
    }
  }

  return {
    success: true,
    node: serializeNode(node, 'full')
  };
}

/**
 * Get local styles
 * @param {string} type - Style type filter (PAINT, TEXT, EFFECT, GRID, ALL)
 */
async function getLocalStyles({ type = 'ALL' }) {
  const result = {
    paintStyles: [],
    textStyles: [],
    effectStyles: [],
    gridStyles: []
  };

  if (type === 'ALL' || type === 'PAINT') {
    const styles = await figma.getLocalPaintStylesAsync();
    result.paintStyles = styles.map(style => serializePaintStyle(style));
  }

  if (type === 'ALL' || type === 'TEXT') {
    const styles = await figma.getLocalTextStylesAsync();
    result.textStyles = styles.map(style => serializeTextStyle(style));
  }

  if (type === 'ALL' || type === 'EFFECT') {
    const styles = await figma.getLocalEffectStylesAsync();
    result.effectStyles = styles.map(style => serializeEffectStyle(style));
  }

  if (type === 'ALL' || type === 'GRID') {
    const styles = await figma.getLocalGridStylesAsync();
    result.gridStyles = styles.map(style => serializeGridStyle(style));
  }

  return result;
}

/**
 * Apply a style to a node
 * @param {string} nodeId - Node ID
 * @param {string} styleId - Style ID
 * @param {string} property - Property to apply style to (fills, strokes, text, effects, grid)
 */
async function applyStyle({ nodeId, styleId, property }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // Validate the style exists
  const style = await figma.getStyleByIdAsync(styleId);
  if (!style) {
    throw new Error(`Style not found: ${styleId}`);
  }

  // Map property to the correct styleId property
  const propertyMap = {
    fills: 'fillStyleId',
    strokes: 'strokeStyleId',
    text: 'textStyleId',
    effects: 'effectStyleId',
    grid: 'gridStyleId'
  };

  const styleProperty = propertyMap[property];
  if (!styleProperty) {
    throw new Error(`Invalid property: ${property}`);
  }

  // Check if node supports this style type
  if (!(styleProperty in node)) {
    throw new Error(`Node ${nodeId} (${node.type}) does not support ${property} styles`);
  }

  // Validate style type matches property
  const styleTypeMap = {
    fills: 'PAINT',
    strokes: 'PAINT',
    text: 'TEXT',
    effects: 'EFFECT',
    grid: 'GRID'
  };

  if (style.type !== styleTypeMap[property]) {
    throw new Error(`Style type mismatch: expected ${styleTypeMap[property]} style for ${property}, got ${style.type}`);
  }

  // Apply the style
  node[styleProperty] = styleId;

  return {
    success: true,
    nodeId: node.id,
    property,
    styleId,
    styleName: style.name
  };
}

/**
 * Create a component
 * @param {Object} params - { fromNodeId, x, y, width, height, name, fills, parentId, description }
 */
async function createComponent(params) {
  const {
    fromNodeId,
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = 'Component',
    fills,
    parentId,
    description
  } = params;

  let component;

  if (fromNodeId) {
    // Convert existing node to component
    const node = await figma.getNodeByIdAsync(fromNodeId);
    if (!node) {
      throw new Error(`Node not found: ${fromNodeId}`);
    }

    // Can't convert certain node types
    if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
      throw new Error(`Cannot convert ${node.type} to component`);
    }

    // Use createComponentFromNode if available
    if (typeof figma.createComponentFromNode === 'function') {
      component = figma.createComponentFromNode(node);
    } else {
      // Fallback: create component and copy properties
      component = figma.createComponent();
      component.name = node.name;
      component.x = node.x;
      component.y = node.y;
      if ('resize' in node && 'width' in node) {
        component.resize(node.width, node.height);
      }

      if ('fills' in node) component.fills = clone(node.fills);
      if ('strokes' in node) component.strokes = clone(node.strokes);
      if ('effects' in node) component.effects = clone(node.effects);

      // Move children if it's a container
      if ('children' in node) {
        const children = [...node.children];
        for (const child of children) {
          component.appendChild(child);
        }
      }

      // Insert in same position
      if (node.parent) {
        const index = node.parent.children.indexOf(node);
        node.parent.insertChild(index, component);
      }

      node.remove();
    }
  } else {
    // Create new empty component
    component = figma.createComponent();
    component.x = x;
    component.y = y;
    component.resize(width, height);
    component.name = name;

    if (fills) {
      component.fills = normalizeFills(fills);
    }

    // Add to parent if specified
    if (parentId) {
      const parent = await figma.getNodeByIdAsync(parentId);
      if (parent && 'appendChild' in parent) {
        parent.appendChild(component);
      }
    } else {
      figma.currentPage.appendChild(component);
    }
  }

  if (description) {
    component.description = description;
  }

  return {
    success: true,
    node: serializeNode(component, 'full')
  };
}

/**
 * Create an instance of a component
 * @param {Object} params - { componentId, x, y, parentId, name }
 */
async function createInstance(params) {
  const {
    componentId,
    x = 0,
    y = 0,
    parentId,
    name
  } = params;

  const component = await figma.getNodeByIdAsync(componentId);
  if (!component) {
    throw new Error(`Component not found: ${componentId}`);
  }

  if (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET') {
    throw new Error(`Node ${componentId} is not a component (type: ${component.type})`);
  }

  // For COMPONENT_SET, get the default variant
  let targetComponent = component;
  if (component.type === 'COMPONENT_SET') {
    if (component.children.length > 0) {
      targetComponent = component.children[0];
    } else {
      throw new Error('Component set has no variants');
    }
  }

  const instance = targetComponent.createInstance();
  instance.x = x;
  instance.y = y;

  if (name) {
    instance.name = name;
  }

  // Add to parent if specified
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(instance);
    }
  } else {
    figma.currentPage.appendChild(instance);
  }

  return {
    success: true,
    node: serializeNode(instance, 'full'),
    mainComponentId: targetComponent.id,
    mainComponentName: targetComponent.name
  };
}

// ============================================================
// Phase 3 Commands: Variables, Lines, Constraints
// ============================================================

/**
 * Get local variables and variable collections
 */
async function getLocalVariables({ type: typeFilter = 'ALL' }) {
  // Get all collections
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  // Get all variables
  const allVariables = await figma.variables.getLocalVariablesAsync();

  // Filter variables by type if specified
  var filteredVariables;
  if (typeFilter === 'ALL') {
    filteredVariables = allVariables;
  } else {
    filteredVariables = allVariables.filter(function(v) {
      return v.resolvedType === typeFilter;
    });
  }

  // Serialize collections
  var serializedCollections = collections.map(function(collection) {
    return {
      id: collection.id,
      name: collection.name,
      key: collection.key,
      modes: collection.modes.map(function(mode) {
        return {
          modeId: mode.modeId,
          name: mode.name
        };
      }),
      defaultModeId: collection.defaultModeId,
      remote: collection.remote,
      hiddenFromPublishing: collection.hiddenFromPublishing,
      variableIds: collection.variableIds
    };
  });

  // Serialize variables
  var serializedVariables = filteredVariables.map(function(variable) {
    var varData = {
      id: variable.id,
      name: variable.name,
      key: variable.key,
      variableCollectionId: variable.variableCollectionId,
      resolvedType: variable.resolvedType,
      description: variable.description,
      remote: variable.remote,
      hiddenFromPublishing: variable.hiddenFromPublishing,
      scopes: variable.scopes,
      valuesByMode: {}
    };

    // Get values for each mode
    var collection = collections.find(function(c) {
      return c.id === variable.variableCollectionId;
    });

    if (collection) {
      for (var i = 0; i < collection.modes.length; i++) {
        var mode = collection.modes[i];
        var value = variable.valuesByMode[mode.modeId];

        // Serialize the value based on type
        if (value !== undefined) {
          // Handle VariableAlias (when one variable references another)
          if (typeof value === 'object' && value !== null && value.type === 'VARIABLE_ALIAS') {
            varData.valuesByMode[mode.modeId] = {
              type: 'VARIABLE_ALIAS',
              id: value.id
            };
          } else {
            varData.valuesByMode[mode.modeId] = clone(value);
          }
        }
      }
    }

    return varData;
  });

  return {
    success: true,
    collections: serializedCollections,
    variables: serializedVariables,
    totalCollections: serializedCollections.length,
    totalVariables: serializedVariables.length
  };
}

/**
 * Convert a glob pattern with * wildcards to a regex
 */
function globToRegex(pattern) {
  // Escape regex special chars except *
  var escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Convert * to .*
  escaped = escaped.replace(/\*/g, '.*');
  return new RegExp('^' + escaped + '$', 'i');
}

/**
 * Convert RGB (0-1) color to hex string
 */
function rgbToHex(r, g, b, a) {
  var toHex = function(val) {
    var hex = Math.round(val * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  var hex = '#' + toHex(r) + toHex(g) + toHex(b);
  if (a !== undefined && a < 1) {
    hex += toHex(a);
  }
  return hex.toUpperCase();
}

/**
 * Search variables with filtering - optimized for reduced token usage
 */
async function searchVariables(params) {
  var namePattern = params.namePattern;
  var nameContains = params.nameContains;
  var typeFilter = params.type || 'ALL';
  var collectionName = params.collectionName;
  var compact = params.compact !== false; // default true
  var limit = params.limit || 50;

  // Get all collections and variables
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var allVariables = await figma.variables.getLocalVariablesAsync();

  // Build collection name lookup
  var collectionMap = {};
  for (var i = 0; i < collections.length; i++) {
    collectionMap[collections[i].id] = collections[i];
  }

  // Filter by collection name if specified
  var validCollectionIds = null;
  if (collectionName) {
    validCollectionIds = {};
    var collectionPattern = collectionName.toLowerCase();
    for (var j = 0; j < collections.length; j++) {
      if (collections[j].name.toLowerCase().indexOf(collectionPattern) !== -1) {
        validCollectionIds[collections[j].id] = true;
      }
    }
  }

  // Build name pattern regex if specified
  var nameRegex = null;
  if (namePattern) {
    nameRegex = globToRegex(namePattern);
  }

  // Prepare nameContains for case-insensitive search
  var nameContainsLower = nameContains ? nameContains.toLowerCase() : null;

  // Filter variables
  var filtered = [];
  for (var k = 0; k < allVariables.length; k++) {
    var v = allVariables[k];

    // Type filter
    if (typeFilter !== 'ALL' && v.resolvedType !== typeFilter) {
      continue;
    }

    // Collection filter
    if (validCollectionIds && !validCollectionIds[v.variableCollectionId]) {
      continue;
    }

    // Name pattern filter (glob)
    if (nameRegex && !nameRegex.test(v.name)) {
      continue;
    }

    // Name contains filter (simple substring match)
    if (nameContainsLower && v.name.toLowerCase().indexOf(nameContainsLower) === -1) {
      continue;
    }

    filtered.push(v);

    // Stop if we hit the limit
    if (filtered.length >= limit) {
      break;
    }
  }

  // Serialize results
  var results;
  if (compact) {
    // Compact mode: just id, name, and primary value
    results = filtered.map(function(variable) {
      var collection = collectionMap[variable.variableCollectionId];
      var defaultModeId = collection ? collection.defaultModeId : null;
      var value = defaultModeId ? variable.valuesByMode[defaultModeId] : null;

      var result = {
        id: variable.id,
        name: variable.name,
        type: variable.resolvedType
      };

      // For colors, convert to hex
      if (variable.resolvedType === 'COLOR' && value && typeof value === 'object') {
        if (value.type === 'VARIABLE_ALIAS') {
          result.value = { aliasOf: value.id };
        } else {
          result.hex = rgbToHex(value.r, value.g, value.b, value.a);
        }
      } else if (value !== undefined) {
        if (typeof value === 'object' && value !== null && value.type === 'VARIABLE_ALIAS') {
          result.value = { aliasOf: value.id };
        } else {
          result.value = value;
        }
      }

      return result;
    });
  } else {
    // Full mode: all metadata (same as getLocalVariables)
    results = filtered.map(function(variable) {
      var collection = collectionMap[variable.variableCollectionId];
      var varData = {
        id: variable.id,
        name: variable.name,
        key: variable.key,
        variableCollectionId: variable.variableCollectionId,
        collectionName: collection ? collection.name : null,
        resolvedType: variable.resolvedType,
        description: variable.description,
        scopes: variable.scopes,
        valuesByMode: {}
      };

      // Get values for each mode
      if (collection) {
        for (var m = 0; m < collection.modes.length; m++) {
          var mode = collection.modes[m];
          var val = variable.valuesByMode[mode.modeId];
          if (val !== undefined) {
            if (typeof val === 'object' && val !== null && val.type === 'VARIABLE_ALIAS') {
              varData.valuesByMode[mode.modeId] = { type: 'VARIABLE_ALIAS', id: val.id };
            } else {
              varData.valuesByMode[mode.modeId] = clone(val);
            }
          }
        }
      }

      return varData;
    });
  }

  return {
    success: true,
    variables: results,
    totalMatches: results.length,
    query: {
      namePattern: namePattern || null,
      nameContains: nameContains || null,
      type: typeFilter,
      collectionName: collectionName || null,
      compact: compact,
      limit: limit
    }
  };
}

// ============================================================
// Smart Query Functions (token-efficient search)
// ============================================================

/**
 * Check if a node is a descendant of a parent node
 */
function isDescendantOf(node, parentId, maxDepth) {
  if (maxDepth === 0) return false;

  var current = node.parent;
  var depth = 1;

  while (current) {
    if (current.id === parentId) {
      return maxDepth === -1 || depth <= maxDepth;
    }
    depth++;
    if (maxDepth !== -1 && depth > maxDepth) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Serialize a node for compact output
 */
function serializeNodeCompact(node) {
  var result = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  if (node.parent) {
    result.parentId = node.parent.id;
  }

  if ('children' in node) {
    result.childCount = node.children.length;
  }

  return result;
}

/**
 * Search nodes by name within a scope - optimized for reduced token usage
 */
async function searchNodes(params) {
  var parentId = params.parentId;
  var nameContains = params.nameContains;
  var namePattern = params.namePattern;
  var types = params.types;
  var maxDepth = params.maxDepth !== undefined ? params.maxDepth : -1;
  var compact = params.compact !== false;
  var limit = params.limit || 50;

  // parentId is required
  if (!parentId) {
    throw new Error('parentId is required for search_nodes');
  }

  // Get parent node
  var parent = await figma.getNodeByIdAsync(parentId);
  if (!parent) {
    throw new Error('Parent node not found: ' + parentId);
  }

  // Build name regex if pattern specified
  var nameRegex = null;
  if (namePattern) {
    nameRegex = globToRegex(namePattern);
  }
  var nameContainsLower = nameContains ? nameContains.toLowerCase() : null;

  // Use findAllWithCriteria for type filtering (much faster)
  var candidates;
  if (types && types.length > 0 && 'findAllWithCriteria' in parent) {
    candidates = parent.findAllWithCriteria({ types: types });
  } else if ('findAll' in parent) {
    candidates = parent.findAll(function() { return true; });
  } else {
    // Parent doesn't support children traversal
    candidates = [];
  }

  // Filter by name and depth
  var filtered = [];
  for (var i = 0; i < candidates.length; i++) {
    var node = candidates[i];

    // Skip if maxDepth is limited and node is too deep
    if (maxDepth !== -1 && maxDepth > 0) {
      if (!isDescendantOf(node, parentId, maxDepth)) {
        continue;
      }
    }

    // Name pattern filter (glob)
    if (nameRegex && !nameRegex.test(node.name)) {
      continue;
    }

    // Name contains filter (simple substring match)
    if (nameContainsLower && node.name.toLowerCase().indexOf(nameContainsLower) === -1) {
      continue;
    }

    filtered.push(node);

    if (filtered.length >= limit) {
      break;
    }
  }

  // Serialize results
  var results;
  if (compact) {
    results = filtered.map(serializeNodeCompact);
  } else {
    results = filtered.map(function(n) {
      return serializeNode(n, 'full');
    });
  }

  return {
    success: true,
    nodes: results,
    totalMatches: results.length,
    query: {
      parentId: parentId,
      nameContains: nameContains || null,
      namePattern: namePattern || null,
      types: types || null,
      maxDepth: maxDepth,
      compact: compact,
      limit: limit
    }
  };
}

/**
 * Search local components by name - optimized for reduced token usage
 */
async function searchComponents(params) {
  var nameContains = params.nameContains;
  var namePattern = params.namePattern;
  var includeVariants = params.includeVariants || false;
  var compact = params.compact !== false;
  var limit = params.limit || 50;

  // Load all pages first (required for findAllWithCriteria on root)
  await figma.loadAllPagesAsync();

  // Build name regex if pattern specified
  var nameRegex = null;
  if (namePattern) {
    nameRegex = globToRegex(namePattern);
  }
  var nameContainsLower = nameContains ? nameContains.toLowerCase() : null;

  // Find all components and component sets
  var searchTypes = includeVariants ? ['COMPONENT', 'COMPONENT_SET'] : ['COMPONENT_SET', 'COMPONENT'];
  var candidates = figma.root.findAllWithCriteria({ types: searchTypes });

  // Filter by name
  var filtered = [];
  for (var i = 0; i < candidates.length; i++) {
    var node = candidates[i];

    // If not including variants, skip components that are inside component sets
    if (!includeVariants && node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
      continue;
    }

    // Name pattern filter (glob)
    if (nameRegex && !nameRegex.test(node.name)) {
      continue;
    }

    // Name contains filter (simple substring match)
    if (nameContainsLower && node.name.toLowerCase().indexOf(nameContainsLower) === -1) {
      continue;
    }

    filtered.push(node);

    if (filtered.length >= limit) {
      break;
    }
  }

  // Serialize results
  var results;
  if (compact) {
    results = filtered.map(function(node) {
      var result = {
        id: node.id,
        name: node.name,
        type: node.type
      };
      if (node.description) {
        result.description = node.description;
      }
      if (node.type === 'COMPONENT_SET') {
        result.hasVariants = true;
        result.variantCount = node.children ? node.children.length : 0;
      }
      return result;
    });
  } else {
    results = filtered.map(function(n) {
      return serializeNode(n, 'full');
    });
  }

  return {
    success: true,
    components: results,
    totalMatches: results.length,
    query: {
      nameContains: nameContains || null,
      namePattern: namePattern || null,
      includeVariants: includeVariants,
      compact: compact,
      limit: limit
    }
  };
}

/**
 * Search local styles by name - optimized for reduced token usage
 */
async function searchStyles(params) {
  var nameContains = params.nameContains;
  var typeFilter = params.type || 'ALL';
  var compact = params.compact !== false;
  var limit = params.limit || 50;

  var nameContainsLower = nameContains ? nameContains.toLowerCase() : null;

  // Gather styles based on type filter
  var allStyles = [];

  if (typeFilter === 'ALL' || typeFilter === 'PAINT') {
    var paintStyles = await figma.getLocalPaintStylesAsync();
    for (var i = 0; i < paintStyles.length; i++) {
      allStyles.push({ style: paintStyles[i], styleType: 'PAINT' });
    }
  }
  if (typeFilter === 'ALL' || typeFilter === 'TEXT') {
    var textStyles = await figma.getLocalTextStylesAsync();
    for (var j = 0; j < textStyles.length; j++) {
      allStyles.push({ style: textStyles[j], styleType: 'TEXT' });
    }
  }
  if (typeFilter === 'ALL' || typeFilter === 'EFFECT') {
    var effectStyles = await figma.getLocalEffectStylesAsync();
    for (var k = 0; k < effectStyles.length; k++) {
      allStyles.push({ style: effectStyles[k], styleType: 'EFFECT' });
    }
  }
  if (typeFilter === 'ALL' || typeFilter === 'GRID') {
    var gridStyles = await figma.getLocalGridStylesAsync();
    for (var l = 0; l < gridStyles.length; l++) {
      allStyles.push({ style: gridStyles[l], styleType: 'GRID' });
    }
  }

  // Filter by name
  var filtered = [];
  for (var m = 0; m < allStyles.length; m++) {
    var item = allStyles[m];

    // Name contains filter (simple substring match)
    if (nameContainsLower && item.style.name.toLowerCase().indexOf(nameContainsLower) === -1) {
      continue;
    }

    filtered.push(item);

    if (filtered.length >= limit) {
      break;
    }
  }

  // Serialize results
  var results;
  if (compact) {
    results = filtered.map(function(item) {
      return {
        id: item.style.id,
        name: item.style.name,
        type: item.styleType,
        description: item.style.description || null
      };
    });
  } else {
    results = filtered.map(function(item) {
      var result = {
        id: item.style.id,
        name: item.style.name,
        key: item.style.key,
        type: item.styleType,
        description: item.style.description || null
      };
      // Add type-specific data
      if (item.styleType === 'PAINT' && item.style.paints) {
        result.paints = safeClone(item.style.paints);
      }
      if (item.styleType === 'TEXT') {
        result.fontSize = item.style.fontSize;
        result.fontName = safeClone(item.style.fontName);
      }
      if (item.styleType === 'EFFECT' && item.style.effects) {
        result.effects = safeClone(item.style.effects);
      }
      if (item.styleType === 'GRID' && item.style.layoutGrids) {
        result.layoutGrids = safeClone(item.style.layoutGrids);
      }
      return result;
    });
  }

  return {
    success: true,
    styles: results,
    totalMatches: results.length,
    query: {
      nameContains: nameContains || null,
      type: typeFilter,
      compact: compact,
      limit: limit
    }
  };
}

/**
 * Get immediate children of a node - for browsing hierarchy one level at a time
 */
async function getChildren(params) {
  var parentId = params.parentId;
  var compact = params.compact !== false;

  if (!parentId) {
    throw new Error('parentId is required for get_children');
  }

  var parent = await figma.getNodeByIdAsync(parentId);
  if (!parent) {
    throw new Error('Parent node not found: ' + parentId);
  }

  if (!('children' in parent)) {
    return {
      success: true,
      parentId: parentId,
      parentName: parent.name,
      children: [],
      totalChildren: 0,
      message: 'Node has no children property (not a container type)'
    };
  }

  var children = parent.children;
  var results;

  if (compact) {
    results = children.map(serializeNodeCompact);
  } else {
    results = children.map(function(n) {
      return serializeNode(n, 'full');
    });
  }

  return {
    success: true,
    parentId: parentId,
    parentName: parent.name,
    children: results,
    totalChildren: children.length
  };
}

/**
 * Set variable value or bind variable to node
 */
async function setVariable(params) {
  var variableId = params.variableId;
  var modeId = params.modeId;
  var value = params.value;
  var nodeId = params.nodeId;
  var field = params.field;
  var paintIndex = params.paintIndex !== undefined ? params.paintIndex : 0;

  // Get the variable
  var variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) {
    throw new Error('Variable not found: ' + variableId);
  }

  // Operation 1: Set variable value for a mode
  if (value !== undefined && modeId) {
    variable.setValueForMode(modeId, value);

    return {
      success: true,
      operation: 'setValue',
      variableId: variable.id,
      variableName: variable.name,
      modeId: modeId,
      value: clone(value)
    };
  }

  // Operation 2: Bind variable to node property
  if (nodeId && field) {
    var node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error('Node not found: ' + nodeId);
    }

    // Check if this is a fills/strokes binding (requires special handling)
    if (field === 'fills' || field === 'strokes') {
      if (variable.resolvedType !== 'COLOR') {
        throw new Error('Cannot bind ' + variable.resolvedType + ' variable to ' + field + '. Only COLOR variables can be bound to fills/strokes.');
      }

      if (!(field in node)) {
        throw new Error('Node ' + nodeId + ' (' + node.type + ') does not support ' + field);
      }

      // Get existing paints or create default
      var paints = node[field];
      if (!Array.isArray(paints) || paints.length === 0) {
        // Create a default solid paint
        node[field] = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
        paints = node[field];
      }

      // Get the target paint
      var currentPaints = clone(node[field]);
      var targetPaint = currentPaints[paintIndex];

      if (!targetPaint || targetPaint.type !== 'SOLID') {
        throw new Error('Paint at index ' + paintIndex + ' must be a SOLID paint to bind a color variable');
      }

      // Use setBoundVariableForPaint helper
      var boundPaint = figma.variables.setBoundVariableForPaint(
        targetPaint,
        'color',
        variable
      );

      currentPaints[paintIndex] = boundPaint;
      node[field] = currentPaints;

      return {
        success: true,
        operation: 'bindToNode',
        variableId: variable.id,
        variableName: variable.name,
        nodeId: node.id,
        field: field,
        paintIndex: paintIndex
      };
    }

    // Standard bindable fields (opacity, cornerRadius, strokeWeight, etc.)
    if (!('setBoundVariable' in node)) {
      throw new Error('Node ' + nodeId + ' (' + node.type + ') does not support setBoundVariable');
    }

    // Validate the field exists on the node
    if (!(field in node)) {
      throw new Error('Node ' + nodeId + ' (' + node.type + ') does not have field "' + field + '"');
    }

    // Bind the variable
    node.setBoundVariable(field, variable);

    return {
      success: true,
      operation: 'bindToNode',
      variableId: variable.id,
      variableName: variable.name,
      nodeId: node.id,
      field: field
    };
  }

  throw new Error('Must provide either (modeId + value) to set variable value, or (nodeId + field) to bind variable');
}

/**
 * Create a line
 */
async function createLine(params) {
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var length = params.length !== undefined ? params.length : 100;
  var rotation = params.rotation !== undefined ? params.rotation : 0;
  var name = params.name || 'Line';
  var strokeWeight = params.strokeWeight !== undefined ? params.strokeWeight : 1;
  var strokes = params.strokes;
  var strokeCap = params.strokeCap || 'NONE';
  var parentId = params.parentId;

  var line = figma.createLine();
  line.x = x;
  line.y = y;
  line.name = name;

  // Set line length (width) - lines have height of 0
  line.resize(length, 0);

  // Set rotation
  line.rotation = rotation;

  // Set stroke properties
  line.strokeWeight = strokeWeight;

  if (strokes) {
    line.strokes = normalizeFills(strokes); // Reuse fill normalization for strokes
  } else {
    // Default to black stroke so line is visible
    line.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  }

  line.strokeCap = strokeCap;

  // Add to parent if specified, otherwise add to current page
  if (parentId) {
    var parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(line);
    }
  } else {
    figma.currentPage.appendChild(line);
  }

  return {
    success: true,
    node: serializeNode(line, 'full')
  };
}

/**
 * Set constraints on a node
 */
async function setConstraints({ nodeId, horizontal, vertical }) {
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error('Node not found: ' + nodeId);
  }

  if (!('constraints' in node)) {
    throw new Error('Node ' + nodeId + ' (' + node.type + ') does not support constraints');
  }

  // Check if node has a parent
  if (!node.parent) {
    throw new Error('Node ' + nodeId + ' has no parent. Constraints require a parent frame.');
  }

  // Check if parent is an auto-layout frame
  if ('layoutMode' in node.parent && node.parent.layoutMode !== 'NONE') {
    throw new Error('Cannot set constraints on node ' + nodeId + ' because its parent is an auto-layout frame. Use layoutAlign instead.');
  }

  // Get current constraints
  var currentConstraints = node.constraints;

  // Update constraints (only update provided values)
  var newHorizontal = horizontal !== undefined ? horizontal : currentConstraints.horizontal;
  var newVertical = vertical !== undefined ? vertical : currentConstraints.vertical;

  node.constraints = {
    horizontal: newHorizontal,
    vertical: newVertical
  };

  return {
    success: true,
    nodeId: node.id,
    constraints: {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical
    }
  };
}

// ============================================================
// Phase 4 Commands: Polygons, Boolean Operations, Viewport, Blend Mode, Detach
// ============================================================

/**
 * Create a polygon or star
 */
async function createPolygon(params) {
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var width = params.width !== undefined ? params.width : 100;
  var height = params.height !== undefined ? params.height : 100;
  var pointCount = params.pointCount !== undefined ? params.pointCount : 5;
  var innerRadius = params.innerRadius;
  var name = params.name;
  var fills = params.fills;
  var strokes = params.strokes;
  var strokeWeight = params.strokeWeight;
  var cornerRadius = params.cornerRadius;
  var parentId = params.parentId;

  // Create star if innerRadius is provided, otherwise polygon
  var shape;
  if (innerRadius !== undefined) {
    shape = figma.createStar();
    shape.innerRadius = innerRadius;
    if (!name) name = 'Star';
  } else {
    shape = figma.createPolygon();
    if (!name) name = 'Polygon';
  }

  shape.x = x;
  shape.y = y;
  shape.resize(width, height);
  shape.name = name;
  shape.pointCount = pointCount;

  if (fills) {
    shape.fills = normalizeFills(fills);
  }

  if (strokes) {
    shape.strokes = normalizeFills(strokes);
  }

  if (strokeWeight !== undefined) {
    shape.strokeWeight = strokeWeight;
  }

  if (cornerRadius !== undefined) {
    shape.cornerRadius = cornerRadius;
  }

  // Add to parent if specified, otherwise add to current page
  if (parentId) {
    var parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(shape);
    }
  } else {
    figma.currentPage.appendChild(shape);
  }

  return {
    success: true,
    node: serializeNode(shape, 'full')
  };
}

/**
 * Perform boolean operation on nodes
 */
async function booleanOperation(params) {
  var operation = params.operation;
  var nodeIds = params.nodeIds;
  var name = params.name;

  // Get all nodes
  var nodes = [];
  for (var i = 0; i < nodeIds.length; i++) {
    var node = await figma.getNodeByIdAsync(nodeIds[i]);
    if (!node) {
      throw new Error('Node not found: ' + nodeIds[i]);
    }
    nodes.push(node);
  }

  // Get common parent from first node
  var parent = nodes[0].parent;
  if (!parent) {
    throw new Error('Nodes must have a parent for boolean operations');
  }

  // Verify all nodes have same parent
  for (var j = 1; j < nodes.length; j++) {
    if (nodes[j].parent !== parent) {
      throw new Error('All nodes must have the same parent for boolean operations');
    }
  }

  // Perform the operation
  var result;
  switch (operation) {
    case 'UNION':
      result = figma.union(nodes, parent);
      break;
    case 'SUBTRACT':
      result = figma.subtract(nodes, parent);
      break;
    case 'INTERSECT':
      result = figma.intersect(nodes, parent);
      break;
    case 'EXCLUDE':
      result = figma.exclude(nodes, parent);
      break;
    case 'FLATTEN':
      result = figma.flatten(nodes, parent);
      break;
    default:
      throw new Error('Invalid operation: ' + operation);
  }

  if (name) {
    result.name = name;
  }

  return {
    success: true,
    nodeId: result.id,
    type: result.type,
    operation: operation,
    node: serializeNode(result, 'full')
  };
}

/**
 * Zoom viewport to node(s)
 */
async function zoomToNode({ nodeIds }) {
  var nodes = [];
  for (var i = 0; i < nodeIds.length; i++) {
    var node = await figma.getNodeByIdAsync(nodeIds[i]);
    if (!node) {
      throw new Error('Node not found: ' + nodeIds[i]);
    }
    nodes.push(node);
  }

  // Ensure we're on the correct page (navigate to first node's page)
  var pageNode = nodes[0].parent;
  while (pageNode && pageNode.type !== 'PAGE') {
    pageNode = pageNode.parent;
  }

  if (pageNode && pageNode.type === 'PAGE' && pageNode !== figma.currentPage) {
    await figma.setCurrentPageAsync(pageNode);
  }

  // Zoom to the nodes
  figma.viewport.scrollAndZoomIntoView(nodes);

  return {
    success: true,
    zoomedTo: nodeIds,
    zoom: figma.viewport.zoom,
    center: {
      x: figma.viewport.center.x,
      y: figma.viewport.center.y
    }
  };
}

/**
 * Set blend mode on a node
 */
async function setBlendMode({ nodeId, blendMode }) {
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error('Node not found: ' + nodeId);
  }

  if (!('blendMode' in node)) {
    throw new Error('Node ' + nodeId + ' (' + node.type + ') does not support blend mode');
  }

  node.blendMode = blendMode;

  return {
    success: true,
    nodeId: node.id,
    blendMode: node.blendMode
  };
}

/**
 * Detach instance from component
 */
async function detachInstance({ nodeId }) {
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error('Node not found: ' + nodeId);
  }

  if (node.type !== 'INSTANCE') {
    throw new Error('Node ' + nodeId + ' is not an instance (type: ' + node.type + ')');
  }

  // Detach the instance - returns a FrameNode
  var frame = node.detachInstance();

  return {
    success: true,
    nodeId: frame.id,
    type: frame.type,
    name: frame.name,
    detachedInfo: frame.detachedInfo ? clone(frame.detachedInfo) : null
  };
}

// ============================================================
// Phase 5 Commands: Layout Align, Vector, Rename, Reorder
// ============================================================

/**
 * Set layout align properties on a node (for auto-layout children)
 */
async function setLayoutAlign(params) {
  var nodeId = params.nodeId;
  var layoutAlign = params.layoutAlign;
  var layoutGrow = params.layoutGrow;
  var layoutPositioning = params.layoutPositioning;

  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error('Node not found: ' + nodeId);
  }

  // Check if node is in an auto-layout parent
  if (!node.parent || !('layoutMode' in node.parent) || node.parent.layoutMode === 'NONE') {
    throw new Error('Node ' + nodeId + ' is not a child of an auto-layout frame');
  }

  // Set layout align (counter-axis alignment for this child)
  if (layoutAlign !== undefined) {
    if (!('layoutAlign' in node)) {
      throw new Error('Node ' + nodeId + ' does not support layoutAlign');
    }
    node.layoutAlign = layoutAlign;
  }

  // Set layout grow (primary-axis stretch)
  if (layoutGrow !== undefined) {
    if (!('layoutGrow' in node)) {
      throw new Error('Node ' + nodeId + ' does not support layoutGrow');
    }
    node.layoutGrow = layoutGrow;
  }

  // Set layout positioning (auto vs absolute)
  if (layoutPositioning !== undefined) {
    if (!('layoutPositioning' in node)) {
      throw new Error('Node ' + nodeId + ' does not support layoutPositioning');
    }
    node.layoutPositioning = layoutPositioning;
  }

  return {
    success: true,
    nodeId: node.id,
    layoutAlign: 'layoutAlign' in node ? node.layoutAlign : undefined,
    layoutGrow: 'layoutGrow' in node ? node.layoutGrow : undefined,
    layoutPositioning: 'layoutPositioning' in node ? node.layoutPositioning : undefined
  };
}

/**
 * Create a custom vector with path data
 */
async function createVector(params) {
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var data = params.data;
  var windingRule = params.windingRule || 'NONZERO';
  var name = params.name || 'Vector';
  var fills = params.fills;
  var strokes = params.strokes;
  var strokeWeight = params.strokeWeight;
  var parentId = params.parentId;

  // Create the vector
  var vector = figma.createVector();
  vector.name = name;

  // Set the vector path data
  vector.vectorPaths = [{
    windingRule: windingRule,
    data: data
  }];

  // Position the vector - note: after setting vectorPaths, the node may have adjusted position
  vector.x = x;
  vector.y = y;

  // Apply fills
  if (fills) {
    vector.fills = normalizeFills(fills);
  }

  // Apply strokes
  if (strokes) {
    vector.strokes = normalizeFills(strokes);
  }

  if (strokeWeight !== undefined) {
    vector.strokeWeight = strokeWeight;
  }

  // Add to parent if specified
  if (parentId) {
    var parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(vector);
    }
  } else {
    figma.currentPage.appendChild(vector);
  }

  return {
    success: true,
    node: serializeNode(vector, 'full')
  };
}

/**
 * Rename one or more nodes
 */
async function renameNode(params) {
  var nodeId = params.nodeId;
  var nodeIds = params.nodeIds;
  var name = params.name;

  // Get the list of node IDs to process
  var ids = nodeIds || [nodeId];
  var results = [];
  var notFound = [];

  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var node = await figma.getNodeByIdAsync(id);

    if (!node) {
      notFound.push(id);
      continue;
    }

    // Can't rename document or pages this way (pages have special handling)
    if (node.type === 'DOCUMENT') {
      throw new Error('Cannot rename the document root');
    }

    node.name = name;
    results.push({
      id: node.id,
      name: node.name,
      type: node.type
    });
  }

  return {
    success: true,
    renamed: results,
    notFound: notFound
  };
}

/**
 * Reorder a node (change z-order)
 */
async function reorderNode({ nodeId, position }) {
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error('Node not found: ' + nodeId);
  }

  var parent = node.parent;
  if (!parent) {
    throw new Error('Node ' + nodeId + ' has no parent');
  }

  // Can't reorder pages or document
  if (node.type === 'PAGE' || node.type === 'DOCUMENT') {
    throw new Error('Cannot reorder ' + node.type + ' nodes');
  }

  // Check if parent supports appendChild/insertChild
  if (!('appendChild' in parent) || !('insertChild' in parent)) {
    throw new Error('Parent does not support reordering');
  }

  var childCount = parent.children.length;
  var oldIndex = parent.children.indexOf(node);

  if (position === 'front') {
    // Bring to front (top of layer stack = end of children array)
    parent.appendChild(node);
  } else if (position === 'back') {
    // Send to back (bottom of layer stack = start of children array)
    parent.insertChild(0, node);
  } else if (typeof position === 'number') {
    // Move to specific index
    var targetIndex = position;
    if (targetIndex < 0) {
      targetIndex = 0;
    } else if (targetIndex >= childCount) {
      targetIndex = childCount - 1;
    }
    parent.insertChild(targetIndex, node);
  } else {
    throw new Error('Invalid position: ' + position + '. Must be "front", "back", or a number.');
  }

  // Get new index
  var newIndex = parent.children.indexOf(node);

  return {
    success: true,
    nodeId: node.id,
    oldIndex: oldIndex,
    newIndex: newIndex,
    position: position
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert color shorthand to Figma fills array
 * Supports:
 *   - { color: "#RRGGBB" }
 *   - { color: "#RRGGBBAA" }
 *   - { r, g, b, a? } (0-1 range)
 *   - Full fills array
 */
function normalizeFills(fills) {
  if (Array.isArray(fills)) {
    return fills;
  }

  if (!fills || typeof fills !== 'object') {
    return [];
  }

  // Shorthand: { color: "#RRGGBB" }
  if (fills.color) {
    const rgb = hexToRgb(fills.color);
    return [{
      type: 'SOLID',
      color: { r: rgb.r, g: rgb.g, b: rgb.b },
      opacity: rgb.a !== undefined ? rgb.a : 1
    }];
  }

  // Shorthand: { r, g, b }
  if ('r' in fills && 'g' in fills && 'b' in fills) {
    return [{
      type: 'SOLID',
      color: { r: fills.r, g: fills.g, b: fills.b },
      opacity: fills.a !== undefined ? fills.a : 1
    }];
  }

  return [];
}

/**
 * Convert hex color to RGB (0-1 range)
 */
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  let r, g, b, a = 1;

  if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  } else if (hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
    a = parseInt(hex.slice(6, 8), 16) / 255;
  } else if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return { r, g, b, a };
}

// ============================================================
// Design System Creation Commands
// ============================================================

/**
 * Set text style properties on an existing text node (uniform styles only)
 */
async function setTextStyle({ nodeId, fontSize, fontFamily, fontStyle, textCase, textDecoration, lineHeight, letterSpacing, textAlignHorizontal, textAlignVertical }) {
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) throw new Error('Node not found: ' + nodeId);
  if (node.type !== 'TEXT') throw new Error('Node ' + nodeId + ' is not a text node');

  // Determine target font
  var currentFont = node.fontName;
  if (currentFont === figma.mixed) {
    // For mixed fonts, get the first character's font as base
    currentFont = node.getRangeFontName(0, 1);
  }

  var targetFamily = fontFamily || currentFont.family;
  var targetStyle = fontStyle || currentFont.style;

  // Load the font before making changes
  await figma.loadFontAsync({ family: targetFamily, style: targetStyle });

  // Apply font name if changed
  if (fontFamily || fontStyle) {
    node.fontName = { family: targetFamily, style: targetStyle };
  }

  // Apply other properties
  if (fontSize !== undefined) node.fontSize = fontSize;
  if (textCase !== undefined) node.textCase = textCase;
  if (textDecoration !== undefined) node.textDecoration = textDecoration;
  if (lineHeight !== undefined) node.lineHeight = lineHeight;
  if (letterSpacing !== undefined) node.letterSpacing = letterSpacing;
  if (textAlignHorizontal !== undefined) node.textAlignHorizontal = textAlignHorizontal;
  if (textAlignVertical !== undefined) node.textAlignVertical = textAlignVertical;

  return {
    success: true,
    nodeId: node.id,
    fontName: clone(node.fontName),
    fontSize: node.fontSize,
    textCase: node.textCase,
    textDecoration: node.textDecoration,
    lineHeight: clone(node.lineHeight),
    letterSpacing: clone(node.letterSpacing),
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical
  };
}

/**
 * Create a new local paint style
 */
async function createPaintStyle({ name, fills, description }) {
  var style = figma.createPaintStyle();
  style.name = name;
  style.paints = normalizeFills(fills);

  if (description) {
    style.description = description;
  }

  return {
    success: true,
    styleId: style.id,
    name: style.name,
    key: style.key,
    paints: clone(style.paints)
  };
}

/**
 * Create a new local text style
 */
async function createTextStyle({ name, fontFamily = 'Inter', fontStyle = 'Regular', fontSize = 16, lineHeight, letterSpacing, textCase, textDecoration, description }) {
  // Load the font first
  await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

  var style = figma.createTextStyle();
  style.name = name;
  style.fontName = { family: fontFamily, style: fontStyle };
  style.fontSize = fontSize;

  if (lineHeight !== undefined) style.lineHeight = lineHeight;
  if (letterSpacing !== undefined) style.letterSpacing = letterSpacing;
  if (textCase !== undefined) style.textCase = textCase;
  if (textDecoration !== undefined) style.textDecoration = textDecoration;
  if (description) style.description = description;

  return {
    success: true,
    styleId: style.id,
    name: style.name,
    key: style.key,
    fontName: clone(style.fontName),
    fontSize: style.fontSize
  };
}

/**
 * Create a new variable collection
 */
async function createVariableCollection({ name, modes }) {
  var collection = figma.variables.createVariableCollection(name);

  // Rename default mode if modes provided
  if (modes && modes.length > 0) {
    // Rename the default mode
    collection.renameMode(collection.modes[0].modeId, modes[0]);

    // Add additional modes (if more than 1)
    for (var i = 1; i < modes.length; i++) {
      collection.addMode(modes[i]);
    }
  }

  return {
    success: true,
    collectionId: collection.id,
    name: collection.name,
    key: collection.key,
    modes: collection.modes.map(function(m) {
      return { modeId: m.modeId, name: m.name };
    }),
    defaultModeId: collection.defaultModeId
  };
}

/**
 * Create a new variable in a collection (with alias support)
 */
async function createVariable({ collectionId, name, type, value, aliasOf, description, scopes }) {
  // Get the collection
  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error('Collection not found: ' + collectionId);
  }

  // Create the variable
  var variable = figma.variables.createVariable(name, collection, type);

  if (description) {
    variable.description = description;
  }

  if (scopes) {
    variable.scopes = scopes;
  }

  // Set value for default mode
  var defaultModeId = collection.defaultModeId;

  if (aliasOf) {
    // Create an alias to another variable
    var targetVariable = await figma.variables.getVariableByIdAsync(aliasOf);
    if (!targetVariable) {
      throw new Error('Alias target variable not found: ' + aliasOf);
    }
    variable.setValueForMode(defaultModeId, {
      type: 'VARIABLE_ALIAS',
      id: aliasOf
    });
  } else if (value !== undefined) {
    // Set direct value
    var resolvedValue = value;

    // Handle color shorthand
    if (type === 'COLOR' && value && typeof value === 'object' && value.color) {
      var rgb = hexToRgb(value.color);
      resolvedValue = { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a !== undefined ? rgb.a : 1 };
    }

    variable.setValueForMode(defaultModeId, resolvedValue);
  }

  return {
    success: true,
    variableId: variable.id,
    name: variable.name,
    key: variable.key,
    type: variable.resolvedType,
    collectionId: collection.id,
    collectionName: collection.name
  };
}

/**
 * Rename an existing variable
 */
async function renameVariable({ variableId, name }) {
  var variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) {
    throw new Error('Variable not found: ' + variableId);
  }

  var oldName = variable.name;
  variable.name = name;

  return {
    success: true,
    variableId: variable.id,
    oldName: oldName,
    newName: variable.name,
    key: variable.key,
    type: variable.resolvedType
  };
}

/**
 * Delete one or more variables
 */
async function deleteVariables({ variableIds }) {
  var deleted = [];
  var errors = [];

  for (var i = 0; i < variableIds.length; i++) {
    var variableId = variableIds[i];
    try {
      var variable = await figma.variables.getVariableByIdAsync(variableId);
      if (!variable) {
        errors.push({ variableId: variableId, error: 'Variable not found' });
        continue;
      }

      var info = {
        variableId: variable.id,
        name: variable.name,
        type: variable.resolvedType
      };

      variable.remove();
      deleted.push(info);
    } catch (err) {
      errors.push({ variableId: variableId, error: err.message });
    }
  }

  return {
    success: true,
    deleted: deleted,
    deletedCount: deleted.length,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Delete a variable collection
 */
async function deleteVariableCollection({ collectionId }) {
  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    return {
      error: {
        code: 'COLLECTION_NOT_FOUND',
        message: 'Variable collection not found: ' + collectionId
      }
    };
  }

  var info = {
    collectionId: collection.id,
    name: collection.name,
    variableCount: collection.variableIds.length
  };

  collection.remove();

  return {
    success: true,
    deleted: info
  };
}

/**
 * Rename a variable collection
 */
async function renameVariableCollection({ collectionId, name }) {
  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    return {
      error: {
        code: 'COLLECTION_NOT_FOUND',
        message: 'Variable collection not found: ' + collectionId
      }
    };
  }

  var oldName = collection.name;
  collection.name = name;

  return {
    success: true,
    collectionId: collection.id,
    oldName: oldName,
    newName: name
  };
}

/**
 * Rename a mode in a variable collection
 */
async function renameMode({ collectionId, modeId, name }) {
  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    return {
      error: {
        code: 'COLLECTION_NOT_FOUND',
        message: 'Variable collection not found: ' + collectionId
      }
    };
  }

  // Find the mode
  var mode = null;
  for (var i = 0; i < collection.modes.length; i++) {
    if (collection.modes[i].modeId === modeId) {
      mode = collection.modes[i];
      break;
    }
  }

  if (!mode) {
    return {
      error: {
        code: 'MODE_NOT_FOUND',
        message: 'Mode not found: ' + modeId
      }
    };
  }

  var oldName = mode.name;
  collection.renameMode(modeId, name);

  return {
    success: true,
    collectionId: collection.id,
    modeId: modeId,
    oldName: oldName,
    newName: name
  };
}

/**
 * Add a mode to a variable collection
 */
async function addMode({ collectionId, name }) {
  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    return {
      error: {
        code: 'COLLECTION_NOT_FOUND',
        message: 'Variable collection not found: ' + collectionId
      }
    };
  }

  var modeId = collection.addMode(name);

  return {
    success: true,
    collectionId: collection.id,
    modeId: modeId,
    name: name,
    totalModes: collection.modes.length
  };
}

/**
 * Delete a mode from a variable collection
 */
async function deleteMode({ collectionId, modeId }) {
  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    return {
      error: {
        code: 'COLLECTION_NOT_FOUND',
        message: 'Variable collection not found: ' + collectionId
      }
    };
  }

  // Cannot delete last mode
  if (collection.modes.length <= 1) {
    return {
      error: {
        code: 'CANNOT_DELETE_LAST_MODE',
        message: 'Cannot delete the last mode in a collection'
      }
    };
  }

  // Find the mode name before deleting
  var modeName = null;
  for (var i = 0; i < collection.modes.length; i++) {
    if (collection.modes[i].modeId === modeId) {
      modeName = collection.modes[i].name;
      break;
    }
  }

  if (!modeName) {
    return {
      error: {
        code: 'MODE_NOT_FOUND',
        message: 'Mode not found: ' + modeId
      }
    };
  }

  collection.removeMode(modeId);

  return {
    success: true,
    collectionId: collection.id,
    deletedModeId: modeId,
    deletedModeName: modeName,
    remainingModes: collection.modes.length
  };
}

/**
 * Unbind a variable from a node property
 */
async function unbindVariable({ nodeId, field, paintIndex }) {
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    return {
      error: {
        code: 'NODE_NOT_FOUND',
        message: 'Node not found: ' + nodeId
      }
    };
  }

  paintIndex = paintIndex || 0;

  // Handle fills and strokes specially
  if (field === 'fills' || field === 'strokes') {
    if (!(field in node)) {
      return {
        error: {
          code: 'FIELD_NOT_SUPPORTED',
          message: 'Node does not support ' + field
        }
      };
    }

    var paints = clone(node[field]);
    if (!paints || !paints[paintIndex]) {
      return {
        error: {
          code: 'PAINT_NOT_FOUND',
          message: 'Paint not found at index ' + paintIndex
        }
      };
    }

    // Remove bound variables from the paint
    if (paints[paintIndex].boundVariables) {
      delete paints[paintIndex].boundVariables;
    }

    node[field] = paints;

    return {
      success: true,
      nodeId: node.id,
      field: field,
      paintIndex: paintIndex
    };
  }

  // For other fields, use setBoundVariable with null
  try {
    node.setBoundVariable(field, null);
  } catch (err) {
    return {
      error: {
        code: 'UNBIND_FAILED',
        message: err.message
      }
    };
  }

  return {
    success: true,
    nodeId: node.id,
    field: field
  };
}

// ============================================================
// Node Serialization
// ============================================================

function serializeNode(node, depth) {
  depth = depth || 'full';

  var base = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  // Minimal mode: just id, name, type + childIds
  if (depth === 'minimal') {
    if ('children' in node) {
      base.childIds = node.children.map(function(c) { return c.id; });
    }
    return base;
  }

  // Add visibility/lock for compact and full
  base.visible = node.visible;
  base.locked = node.locked;

  if (node.parent) {
    base.parentId = node.parent.id;
  }

  // Compact mode: minimal + position/size + childIds (for tree traversal)
  if (depth === 'compact') {
    if ('x' in node) {
      base.x = node.x;
      base.y = node.y;
      base.width = node.width;
      base.height = node.height;
    }
    if ('children' in node) {
      base.childCount = node.children.length;
      base.childIds = node.children.map(function(c) { return c.id; });
    }
    return base;
  }

  // Full mode: everything
  var page = getPageForNode(node);
  if (page) {
    base.pageId = page.id;
  }

  if ('x' in node) {
    base.x = node.x;
    base.y = node.y;
    base.width = node.width;
    base.height = node.height;
    base.rotation = node.rotation;
  }

  if ('absoluteBoundingBox' in node && node.absoluteBoundingBox) {
    base.absoluteBoundingBox = node.absoluteBoundingBox;
  }

  if ('fills' in node) {
    base.fills = clone(node.fills);
    base.strokes = clone(node.strokes);
    base.strokeWeight = node.strokeWeight;
    base.strokeAlign = node.strokeAlign;
    base.effects = clone(node.effects);
    base.opacity = node.opacity;
    base.blendMode = node.blendMode;
  }

  if ('layoutMode' in node) {
    base.layoutMode = node.layoutMode;
    base.primaryAxisSizingMode = node.primaryAxisSizingMode;
    base.counterAxisSizingMode = node.counterAxisSizingMode;
    base.primaryAxisAlignItems = node.primaryAxisAlignItems;
    base.counterAxisAlignItems = node.counterAxisAlignItems;
    base.paddingLeft = node.paddingLeft;
    base.paddingRight = node.paddingRight;
    base.paddingTop = node.paddingTop;
    base.paddingBottom = node.paddingBottom;
    base.itemSpacing = node.itemSpacing;
  }

  if ('constraints' in node) {
    base.constraints = node.constraints;
  }

  if (node.type === 'TEXT') {
    base.characters = node.characters;
    base.fontSize = node.fontSize;
    base.fontName = clone(node.fontName);
    base.textAlignHorizontal = node.textAlignHorizontal;
    base.textAlignVertical = node.textAlignVertical;
    base.lineHeight = clone(node.lineHeight);
    base.letterSpacing = clone(node.letterSpacing);
  }

  if ('cornerRadius' in node) {
    base.cornerRadius = node.cornerRadius;
    if ('topLeftRadius' in node) {
      base.topLeftRadius = node.topLeftRadius;
      base.topRightRadius = node.topRightRadius;
      base.bottomLeftRadius = node.bottomLeftRadius;
      base.bottomRightRadius = node.bottomRightRadius;
    }
  }

  if (node.type === 'COMPONENT') {
    base.componentPropertyDefinitions = clone(node.componentPropertyDefinitions);
  }
  // Skip mainComponent for now - requires async which complicates serialization
  if (node.type === 'INSTANCE') {
    base.isInstance = true;
  }

  if ('children' in node) {
    base.childCount = node.children.length;
    base.childIds = node.children.map(c => c.id);
  }

  return base;
}

function getPageForNode(node) {
  let current = node;
  while (current) {
    if (current.type === 'PAGE') {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Deep clone an object, safely handling Symbols and non-serializable values.
 * Figma's internal objects (boundVariables, fills, etc.) can contain Symbol
 * properties that cause "Cannot unwrap symbol" errors in postMessage.
 */
function clone(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  return safeClone(obj);
}

/**
 * Recursively clone an object, stripping Symbol keys and handling
 * non-serializable values gracefully.
 */
function safeClone(value, seen) {
  // Handle primitives
  if (value === null || value === undefined) {
    return value;
  }

  var type = typeof value;

  // Primitives pass through (except Symbols which become null)
  if (type === 'symbol') {
    return null;
  }
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return value;
  }
  if (type === 'function') {
    return undefined; // Functions can't be cloned
  }

  // Handle arrays
  if (Array.isArray(value)) {
    seen = seen || new WeakSet();
    if (seen.has(value)) {
      return null; // Circular reference
    }
    seen.add(value);

    var arr = [];
    for (var i = 0; i < value.length; i++) {
      arr.push(safeClone(value[i], seen));
    }
    return arr;
  }

  // Handle objects
  if (type === 'object') {
    seen = seen || new WeakSet();
    if (seen.has(value)) {
      return null; // Circular reference
    }
    seen.add(value);

    var result = {};
    var keys = Object.keys(value); // Only string keys, not Symbols

    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      try {
        result[key] = safeClone(value[key], seen);
      } catch (e) {
        // Skip properties that throw on access
        result[key] = null;
      }
    }
    return result;
  }

  return null;
}

/**
 * Normalize effect object to Figma format
 */
function normalizeEffect(effect) {
  const visible = effect.visible !== undefined ? effect.visible : true;

  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    // Normalize color
    let color = { r: 0, g: 0, b: 0, a: 0.25 };
    if (effect.color) {
      if (effect.color.color) {
        // Hex shorthand
        const rgb = hexToRgb(effect.color.color);
        color = { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a !== undefined ? rgb.a : 0.25 };
      } else if ('r' in effect.color) {
        color = {
          r: effect.color.r,
          g: effect.color.g,
          b: effect.color.b,
          a: effect.color.a !== undefined ? effect.color.a : 0.25
        };
      }
    }

    return {
      type: effect.type,
      visible: visible,
      color: color,
      offset: effect.offset || { x: 0, y: 4 },
      radius: effect.radius !== undefined ? effect.radius : 4,
      spread: effect.spread || 0,
      blendMode: effect.blendMode || 'NORMAL'
    };
  } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    return {
      type: effect.type,
      visible: visible,
      radius: effect.radius !== undefined ? effect.radius : 4
    };
  }

  return {
    type: effect.type,
    visible: visible
  };
}

/**
 * Serialize a paint style
 */
function serializePaintStyle(style) {
  return {
    id: style.id,
    name: style.name,
    description: style.description,
    key: style.key,
    type: 'PAINT',
    paints: clone(style.paints)
  };
}

/**
 * Serialize a text style
 */
function serializeTextStyle(style) {
  return {
    id: style.id,
    name: style.name,
    description: style.description,
    key: style.key,
    type: 'TEXT',
    fontSize: style.fontSize,
    fontName: clone(style.fontName),
    textCase: style.textCase,
    textDecoration: style.textDecoration,
    lineHeight: clone(style.lineHeight),
    letterSpacing: clone(style.letterSpacing),
    paragraphSpacing: style.paragraphSpacing,
    paragraphIndent: style.paragraphIndent
  };
}

/**
 * Serialize an effect style
 */
function serializeEffectStyle(style) {
  return {
    id: style.id,
    name: style.name,
    description: style.description,
    key: style.key,
    type: 'EFFECT',
    effects: clone(style.effects)
  };
}

/**
 * Serialize a grid style
 */
function serializeGridStyle(style) {
  return {
    id: style.id,
    name: style.name,
    description: style.description,
    key: style.key,
    type: 'GRID',
    layoutGrids: clone(style.layoutGrids)
  };
}

// ============================================================
// Page Management Commands
// ============================================================

/**
 * Create a new page
 */
async function createPage({ name, index }) {
  const page = figma.createPage();
  page.name = name;

  // Move to specific index if provided
  if (index !== undefined && index >= 0) {
    const pageCount = figma.root.children.length;
    const targetIndex = Math.min(index, pageCount - 1);
    figma.root.insertChild(targetIndex, page);
  }

  return {
    success: true,
    page: {
      id: page.id,
      name: page.name,
      index: figma.root.children.indexOf(page)
    }
  };
}

/**
 * Rename a page
 */
async function renamePage({ pageId, name }) {
  const page = await figma.getNodeByIdAsync(pageId);

  if (!page) {
    return { error: { code: 'PAGE_NOT_FOUND', message: 'Page ' + pageId + ' not found' } };
  }

  if (page.type !== 'PAGE') {
    return { error: { code: 'NOT_A_PAGE', message: 'Node ' + pageId + ' is not a page' } };
  }

  const oldName = page.name;
  page.name = name;

  return {
    success: true,
    page: {
      id: page.id,
      oldName: oldName,
      newName: page.name
    }
  };
}

/**
 * Delete a page
 */
async function deletePage({ pageId }) {
  // Check if this is the last page
  if (figma.root.children.length <= 1) {
    return { error: { code: 'CANNOT_DELETE_LAST_PAGE', message: 'Cannot delete the last page in the document' } };
  }

  const page = await figma.getNodeByIdAsync(pageId);

  if (!page) {
    return { error: { code: 'PAGE_NOT_FOUND', message: 'Page ' + pageId + ' not found' } };
  }

  if (page.type !== 'PAGE') {
    return { error: { code: 'NOT_A_PAGE', message: 'Node ' + pageId + ' is not a page' } };
  }

  // If deleting current page, switch to another page first
  if (figma.currentPage.id === pageId) {
    const otherPage = figma.root.children.find(function(p) { return p.id !== pageId; });
    if (otherPage) {
      await figma.setCurrentPageAsync(otherPage);
    }
  }

  const deletedName = page.name;
  page.remove();

  return {
    success: true,
    deleted: {
      id: pageId,
      name: deletedName
    }
  };
}

/**
 * Reorder a page (change its position in the page list)
 */
async function reorderPage({ pageId, index }) {
  const page = await figma.getNodeByIdAsync(pageId);

  if (!page) {
    return { error: { code: 'PAGE_NOT_FOUND', message: 'Page ' + pageId + ' not found' } };
  }

  if (page.type !== 'PAGE') {
    return { error: { code: 'NOT_A_PAGE', message: 'Node ' + pageId + ' is not a page' } };
  }

  const oldIndex = figma.root.children.indexOf(page);
  const pageCount = figma.root.children.length;
  const targetIndex = Math.max(0, Math.min(index, pageCount - 1));

  figma.root.insertChild(targetIndex, page);

  return {
    success: true,
    page: {
      id: page.id,
      name: page.name,
      oldIndex: oldIndex,
      newIndex: figma.root.children.indexOf(page)
    }
  };
}

// ============================================================
// Node Structure Commands
// ============================================================

/**
 * Reparent nodes - move nodes to a different parent
 */
async function reparentNodes({ nodeIds, newParentId, index }) {
  const newParent = await figma.getNodeByIdAsync(newParentId);

  if (!newParent) {
    return { error: { code: 'PARENT_NOT_FOUND', message: 'Parent node ' + newParentId + ' not found' } };
  }

  // Check if the new parent can have children
  if (!('children' in newParent)) {
    return { error: { code: 'INVALID_PARENT', message: 'Node ' + newParentId + ' cannot have children' } };
  }

  var results = [];
  var errors = [];

  for (var i = 0; i < nodeIds.length; i++) {
    var nodeId = nodeIds[i];
    var node = await figma.getNodeByIdAsync(nodeId);

    if (!node) {
      errors.push({ nodeId: nodeId, error: 'Node not found' });
      continue;
    }

    // Check if node can be moved (not a page or document)
    if (node.type === 'PAGE' || node.type === 'DOCUMENT') {
      errors.push({ nodeId: nodeId, error: 'Cannot reparent page or document' });
      continue;
    }

    // Check for circular reference (can't move a node into itself or its descendants)
    var targetParent = newParent;
    var isCircular = false;
    while (targetParent) {
      if (targetParent.id === node.id) {
        isCircular = true;
        break;
      }
      targetParent = targetParent.parent;
    }

    if (isCircular) {
      errors.push({ nodeId: nodeId, error: 'Cannot move node into itself or its descendants' });
      continue;
    }

    var oldParentId = node.parent ? node.parent.id : null;

    // Move the node
    if (index !== undefined && index >= 0) {
      var targetIdx = Math.min(index, newParent.children.length);
      newParent.insertChild(targetIdx, node);
    } else {
      // Default to front (top of layer stack)
      newParent.appendChild(node);
    }

    results.push({
      nodeId: node.id,
      name: node.name,
      oldParentId: oldParentId,
      newParentId: newParent.id
    });
  }

  return {
    success: true,
    moved: results,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Move nodes to a different page
 */
async function moveToPage({ nodeIds, targetPageId, x, y }) {
  const targetPage = await figma.getNodeByIdAsync(targetPageId);

  if (!targetPage) {
    return { error: { code: 'PAGE_NOT_FOUND', message: 'Target page ' + targetPageId + ' not found' } };
  }

  if (targetPage.type !== 'PAGE') {
    return { error: { code: 'NOT_A_PAGE', message: 'Node ' + targetPageId + ' is not a page' } };
  }

  var results = [];
  var errors = [];

  for (var i = 0; i < nodeIds.length; i++) {
    var nodeId = nodeIds[i];
    var node = await figma.getNodeByIdAsync(nodeId);

    if (!node) {
      errors.push({ nodeId: nodeId, error: 'Node not found' });
      continue;
    }

    // Check if node can be moved
    if (node.type === 'PAGE' || node.type === 'DOCUMENT') {
      errors.push({ nodeId: nodeId, error: 'Cannot move page or document' });
      continue;
    }

    var oldPageId = null;
    var currentPage = node.parent;
    while (currentPage && currentPage.type !== 'PAGE') {
      currentPage = currentPage.parent;
    }
    if (currentPage) {
      oldPageId = currentPage.id;
    }

    // Store original position
    var originalX = 'x' in node ? node.x : 0;
    var originalY = 'y' in node ? node.y : 0;

    // Move to target page
    targetPage.appendChild(node);

    // Set position if specified, otherwise keep relative position
    if (x !== undefined && 'x' in node) {
      node.x = x;
    }
    if (y !== undefined && 'y' in node) {
      node.y = y;
    }

    results.push({
      nodeId: node.id,
      name: node.name,
      oldPageId: oldPageId,
      newPageId: targetPage.id,
      position: {
        x: 'x' in node ? node.x : originalX,
        y: 'y' in node ? node.y : originalY
      }
    });
  }

  return {
    success: true,
    moved: results,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ============================================================
// Component Instance Commands
// ============================================================

/**
 * Swap an instance to use a different component
 */
async function swapInstance({ instanceId, newComponentId }) {
  const instance = await figma.getNodeByIdAsync(instanceId);

  if (!instance) {
    return { error: { code: 'INSTANCE_NOT_FOUND', message: 'Instance ' + instanceId + ' not found' } };
  }

  if (instance.type !== 'INSTANCE') {
    return { error: { code: 'NOT_AN_INSTANCE', message: 'Node ' + instanceId + ' is not a component instance' } };
  }

  const newComponent = await figma.getNodeByIdAsync(newComponentId);

  if (!newComponent) {
    return { error: { code: 'COMPONENT_NOT_FOUND', message: 'Component ' + newComponentId + ' not found' } };
  }

  if (newComponent.type !== 'COMPONENT' && newComponent.type !== 'COMPONENT_SET') {
    return { error: { code: 'NOT_A_COMPONENT', message: 'Node ' + newComponentId + ' is not a component' } };
  }

  // Store original properties
  var originalPosition = { x: instance.x, y: instance.y };
  var originalSize = { width: instance.width, height: instance.height };
  var originalName = instance.name;

  // Swap the component
  instance.swapComponent(newComponent);

  // Restore position (size may change based on new component)
  instance.x = originalPosition.x;
  instance.y = originalPosition.y;

  return {
    success: true,
    instance: {
      id: instance.id,
      name: instance.name,
      newComponentId: newComponent.id,
      newComponentName: newComponent.name,
      position: originalPosition,
      size: {
        width: instance.width,
        height: instance.height
      }
    }
  };
}

/**
 * Duplicate a page - clone entire page with all contents
 */
async function duplicatePage({ pageId, name }) {
  var page = await figma.getNodeByIdAsync(pageId);

  if (!page) {
    return { error: { code: 'PAGE_NOT_FOUND', message: 'Page ' + pageId + ' not found' } };
  }

  if (page.type !== 'PAGE') {
    return { error: { code: 'NOT_A_PAGE', message: 'Node ' + pageId + ' is not a page' } };
  }

  // Create new page
  var newPage = figma.createPage();
  var newName = name || (page.name + ' copy');
  newPage.name = newName;

  // Insert after original page
  var pageIndex = figma.root.children.indexOf(page);
  var insertIndex = pageIndex + 1;
  figma.root.insertChild(insertIndex, newPage);

  // Clone all children from original page, handling font errors gracefully
  var clonedCount = 0;
  var errors = [];

  for (var i = 0; i < page.children.length; i++) {
    var child = page.children[i];
    try {
      var cloned = child.clone();
      newPage.appendChild(cloned);
      clonedCount++;
    } catch (e) {
      errors.push({ nodeId: child.id, nodeName: child.name, error: e.message });
    }
  }

  return {
    success: true,
    page: {
      id: newPage.id,
      name: newPage.name,
      index: figma.root.children.indexOf(newPage),
      childCount: newPage.children.length,
      clonedCount: clonedCount,
      originalChildCount: page.children.length
    },
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Set rotation on nodes
 */
async function setRotation({ nodeIds, rotation }) {
  var rotatedNodes = [];
  var notFound = [];
  var errors = [];

  for (var i = 0; i < nodeIds.length; i++) {
    var nodeId = nodeIds[i];
    var node = await figma.getNodeByIdAsync(nodeId);

    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    if (!('rotation' in node)) {
      errors.push({ nodeId: nodeId, error: 'Node type ' + node.type + ' does not support rotation' });
      continue;
    }

    node.rotation = rotation;
    rotatedNodes.push({
      id: node.id,
      name: node.name,
      type: node.type,
      rotation: node.rotation
    });
  }

  return {
    success: true,
    nodes: rotatedNodes,
    notFound: notFound,
    errors: errors
  };
}

/**
 * Set layout grids on a frame
 */
async function setLayoutGrids({ nodeId, layoutGrids }) {
  var node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    return { error: { code: 'NODE_NOT_FOUND', message: 'Node ' + nodeId + ' not found' } };
  }

  if (!('layoutGrids' in node)) {
    return { error: { code: 'NOT_SUPPORTED', message: 'Node type ' + node.type + ' does not support layout grids' } };
  }

  // Normalize and build layout grids array
  var normalizedGrids = [];
  for (var i = 0; i < layoutGrids.length; i++) {
    var grid = layoutGrids[i];
    var normalized = {
      pattern: grid.pattern || 'GRID',
      visible: grid.visible !== undefined ? grid.visible : true
    };

    // For COLUMNS/ROWS patterns
    if (grid.pattern === 'COLUMNS' || grid.pattern === 'ROWS') {
      normalized.alignment = grid.alignment || 'STRETCH';
      normalized.gutterSize = grid.gutterSize !== undefined ? grid.gutterSize : 20;
      normalized.count = grid.count !== undefined ? grid.count : 4;
      normalized.offset = grid.offset !== undefined ? grid.offset : 0;
      // sectionSize only applies when alignment is not STRETCH
      if (normalized.alignment !== 'STRETCH' && grid.sectionSize !== undefined) {
        normalized.sectionSize = grid.sectionSize;
      }
    } else {
      // GRID pattern uses sectionSize
      normalized.sectionSize = grid.sectionSize !== undefined ? grid.sectionSize : 10;
    }

    // Add color if provided
    if (grid.color) {
      normalized.color = {
        r: grid.color.r,
        g: grid.color.g,
        b: grid.color.b,
        a: grid.color.a !== undefined ? grid.color.a : 0.1
      };
    } else {
      // Default color (red with low opacity)
      normalized.color = { r: 1, g: 0, b: 0, a: 0.1 };
    }

    normalizedGrids.push(normalized);
  }

  node.layoutGrids = normalizedGrids;

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    gridCount: node.layoutGrids.length,
    layoutGrids: clone(node.layoutGrids)
  };
}
