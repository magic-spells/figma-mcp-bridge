/**
 * Claude Figma Bridge Plugin
 *
 * Main thread handles Figma API calls.
 * UI thread (ui.html) handles WebSocket connection.
 */

// Show UI (handles WebSocket connection). Wider in Dev Mode to fit the
// read-only badge.
figma.showUI(__html__, {
  visible: true,
  width: figma.editorType === 'dev' ? 260 : 200,
  height: 40
});

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get_editor_info') {
    figma.ui.postMessage({
      type: 'editor_info',
      payload: {
        editorType: figma.editorType,
        readOnly: figma.editorType === 'dev'
      }
    });
  } else if (msg.type === 'get_handshake_info') {
    // Send document info for handshake
    figma.ui.postMessage({
      type: 'handshake_info',
      payload: {
        pluginVersion: '0.4.0',
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
      // Normalize: Figma's internal API sometimes throws non-Error values.
      // Without this, error.message would be undefined and surface as "Unknown error".
      var msg =
        (error && error.message) ||
        (typeof error === 'string' ? error : null) ||
        (function () { try { return JSON.stringify(error); } catch (_) { return null; } })() ||
        'Unknown error';
      var code = (error && error.code) || 'OPERATION_FAILED';
      figma.ui.postMessage({
        type: 'command_response',
        requestId,
        payload: {
          error: { code: code, message: msg }
        }
      });
    }
  }
};

// ============================================================
// Command Handler
// ============================================================

async function handleCommand(command, payload) {
  requireWritableEditor(command);

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
    case 'set_visible':
      return await setVisible(payload);
    case 'set_clips_content':
      return await setClipsContent(payload);
    case 'set_size_limits':
      return await setSizeLimits(payload);
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
    case 'delete_style':
      return await deleteStyle(payload);
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
    case 'set_variable_mode':
      return await setVariableMode(payload);
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
    case 'combine_as_variants':
      return await combineAsVariants(payload);

    // FigJam commands
    case 'create_sticky':
      return await createSticky(payload);
    case 'set_sticky':
      return await setSticky(payload);
    case 'create_shape_with_text':
      return await createShapeWithText(payload);
    case 'set_shape_type':
      return await setShapeType(payload);
    case 'create_connector':
      return await createConnector(payload);
    case 'set_connector':
      return await setConnector(payload);
    case 'create_section':
      return await createSection(payload);
    case 'set_section':
      return await setSection(payload);
    case 'create_table':
      return await createTable(payload);
    case 'set_table_cell':
      return await setTableCell(payload);
    case 'insert_table_row':
      return await insertTableRow(payload);
    case 'insert_table_column':
      return await insertTableColumn(payload);
    case 'remove_table_row':
      return await removeTableRow(payload);
    case 'remove_table_column':
      return await removeTableColumn(payload);
    case 'resize_table_row':
      return await resizeTableRow(payload);
    case 'resize_table_column':
      return await resizeTableColumn(payload);
    case 'move_table_row':
      return await moveTableRow(payload);
    case 'move_table_column':
      return await moveTableColumn(payload);
    case 'create_code_block':
      return await createCodeBlock(payload);
    case 'set_code_block':
      return await setCodeBlock(payload);
    case 'create_link_preview':
      return await createLinkPreview(payload);

    // Prototype commands
    case 'get_reactions':
      return await getReactions(payload);
    case 'add_reaction':
      return await addReaction(payload);
    case 'remove_reaction':
      return await removeReaction(payload);
    case 'set_flow_starting_point':
      return await setFlowStartingPoint(payload);

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

/**
 * Resolve a node id to a node, with a fallback for instance-sublayer ids.
 *
 * `figma.getNodeByIdAsync` resolves most ids, but it is unreliable for the
 * composite ids Figma hands out for nodes inside instances (the community
 * `I<instanceId>;<childId>` shape — undocumented, but it is what search results
 * and selections actually return). When that lookup comes back null and the id
 * contains a ';', resolve the instance root (the part before the last ';') and
 * walk its subtree comparing `node.id`. This is exactly what search_nodes does
 * implicitly via findAll, which is why search always worked where get_nodes did not.
 *
 * @param {string} nodeId
 * @returns {Promise<BaseNode|null>}
 */
async function resolveNodeById(nodeId) {
  if (typeof nodeId !== 'string' || nodeId === '') return null;

  var node = await figma.getNodeByIdAsync(nodeId);
  if (node) return node;

  if (nodeId.indexOf(';') === -1) return null;
  return await resolveSublayerId(nodeId);
}

/**
 * Fallback resolution for a composite `I<root>;<child>[;<child>...]` id.
 * Tries each ancestor prefix (longest first, with and without the leading `I`)
 * and searches that node's subtree for an exact id match.
 * @param {string} nodeId
 * @returns {Promise<BaseNode|null>}
 */
async function resolveSublayerId(nodeId) {
  var parts = nodeId.split(';');

  for (var i = parts.length - 1; i >= 1; i--) {
    var prefix = parts.slice(0, i).join(';');
    var candidates = [prefix];
    if (prefix.charAt(0) === 'I') candidates.push(prefix.slice(1));

    for (var c = 0; c < candidates.length; c++) {
      var root = null;
      try {
        root = await figma.getNodeByIdAsync(candidates[c]);
      } catch (e) {
        root = null;
      }
      if (!root) continue;
      if (root.id === nodeId) return root;

      var found = findDescendantById(root, nodeId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Depth-first search of a subtree for an exact node id.
 * @param {BaseNode} root
 * @param {string} targetId
 * @returns {BaseNode|null}
 */
function findDescendantById(root, targetId) {
  if (!root || !('children' in root)) return null;

  if (typeof root.findOne === 'function') {
    try {
      return root.findOne(function (n) { return n.id === targetId; });
    } catch (e) {
      // fall through to the manual walk
    }
  }

  var stack = root.children.slice();
  while (stack.length > 0) {
    var current = stack.pop();
    if (current.id === targetId) return current;
    if ('children' in current) {
      var kids = current.children;
      for (var k = 0; k < kids.length; k++) stack.push(kids[k]);
    }
  }
  return null;
}

/**
 * Human-readable explanation for an id that could not be resolved.
 * @param {string} nodeId
 * @returns {string}
 */
function describeUnresolvedId(nodeId) {
  if (typeof nodeId === 'string' && nodeId.indexOf(';') !== -1) {
    var rootId = nodeId.split(';')[0];
    return 'No node with id "' + nodeId + '" exists in this document. It has the shape of an ' +
      'instance-sublayer id, so resolution also walked the subtree of "' + rootId + '" and found ' +
      'no match. Sublayer ids change when the instance\'s master changes, so the id is most likely ' +
      'stale — re-find the node with figma_search_nodes.';
  }
  return 'No node with id "' + nodeId + '" exists in this document.';
}

async function getNodes({ nodeIds = [], depth }) {
  var nodes = [];
  var notFound = [];
  var notFoundDetails = [];
  var serializeDepth = depth || 'full';

  for (var i = 0; i < nodeIds.length; i++) {
    var nodeId = nodeIds[i];
    var node = await resolveNodeById(nodeId);
    if (node) {
      nodes.push(serializeNode(node, serializeDepth));
    } else {
      notFound.push(nodeId);
      notFoundDetails.push({ id: nodeId, message: describeUnresolvedId(nodeId) });
    }
  }

  var result = { nodes: nodes, notFound: notFound };
  if (notFoundDetails.length > 0) {
    result.notFoundDetails = notFoundDetails;
  }
  return result;
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
 * @param {Array|Object} strokes - Stroke array or shorthand (optional — omit to leave colors alone)
 * @param {number} strokeWeight - Optional uniform stroke weight
 * @param {number} strokeTopWeight - Optional per-side weights (frame-likes and rectangles only)
 * @param {number} strokeRightWeight
 * @param {number} strokeBottomWeight
 * @param {number} strokeLeftWeight
 */
async function setStrokes({ nodeId, strokes, strokeWeight, strokeTopWeight, strokeRightWeight, strokeBottomWeight, strokeLeftWeight }) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  if (!('strokes' in node)) {
    throw new Error(`Node ${nodeId} does not support strokes`);
  }

  const hasPerSide =
    strokeTopWeight !== undefined ||
    strokeRightWeight !== undefined ||
    strokeBottomWeight !== undefined ||
    strokeLeftWeight !== undefined;

  // Per-side weights live on IndividualStrokesMixin: RECTANGLE plus the frame-likes
  // (FRAME, COMPONENT, COMPONENT_SET, INSTANCE, SLOT, SLIDE). Error rather than
  // silently dropping them on unsupported types.
  if (hasPerSide && !('strokeTopWeight' in node)) {
    throw new Error(`Node ${nodeId} (${node.type}) does not support per-side stroke weights. Supported types: RECTANGLE, FRAME, COMPONENT, COMPONENT_SET, INSTANCE, SLOT, SLIDE.`);
  }

  // Convert shorthand to full strokes array (omit strokes to change weights only)
  if (strokes !== undefined) {
    node.strokes = normalizeFills(strokes); // Same format as fills
  }

  // Uniform weight first, so per-side values below can override individual sides
  if (strokeWeight !== undefined && 'strokeWeight' in node) {
    node.strokeWeight = strokeWeight;
  }

  if (hasPerSide) {
    if (strokeTopWeight !== undefined) node.strokeTopWeight = strokeTopWeight;
    if (strokeRightWeight !== undefined) node.strokeRightWeight = strokeRightWeight;
    if (strokeBottomWeight !== undefined) node.strokeBottomWeight = strokeBottomWeight;
    if (strokeLeftWeight !== undefined) node.strokeLeftWeight = strokeLeftWeight;
  }

  const result = {
    success: true,
    nodeId: node.id,
    strokes: clone(node.strokes),
    strokeWeight: readStrokeWeight(node)
  };

  if ('strokeTopWeight' in node) {
    result.strokeTopWeight = node.strokeTopWeight;
    result.strokeRightWeight = node.strokeRightWeight;
    result.strokeBottomWeight = node.strokeBottomWeight;
    result.strokeLeftWeight = node.strokeLeftWeight;
  }

  return result;
}

/**
 * Read a node's aggregate stroke weight.
 * Returns the string 'MIXED' when per-side weights differ — figma.mixed is a Symbol
 * and would otherwise serialize to null and read as "no stroke weight".
 */
function readStrokeWeight(node) {
  if (!('strokeWeight' in node)) {
    return undefined;
  }
  return node.strokeWeight === figma.mixed ? 'MIXED' : node.strokeWeight;
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

  // FigJam TextSublayer-bearing nodes: text is a sublayer, not a child node
  if (
    node.type === 'STICKY' ||
    node.type === 'SHAPE_WITH_TEXT' ||
    node.type === 'CONNECTOR' ||
    node.type === 'TABLE_CELL'
  ) {
    await loadFontForSublayer(node.text);
    node.text.characters = text;
    return {
      success: true,
      nodeId: node.id,
      characters: node.text.characters
    };
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

// Sizes are floats; Figma rounds/clamps. Anything inside this is "the same size".
const SIZE_EPSILON = 0.01;

/**
 * Resize nodes.
 *
 * Three failure modes this guards against, all of which used to return success:
 *  - the node is an instance sublayer: resize() is a silent no-op (#16)
 *  - the node clamps (min/max limits, text auto-resize) so the result differs
 *  - resize destroys an existing width/height variable bind (#17)
 *
 * Everything is validated BEFORE the first mutation so a bad node in the batch
 * cannot leave the rest half-applied.
 *
 * @param {string[]} nodeIds - Array of node IDs to resize
 * @param {number} width - New width
 * @param {number} height - New height
 */
async function resizeNodes({ nodeIds, width, height }) {
  const resizedNodes = [];
  const notFound = [];
  const resolved = [];
  const errors = [];
  const warnings = [];
  const reboundAll = [];

  // ---- Phase 1: resolve + validate, no mutation yet ----
  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    if (!('resize' in node)) {
      throw new Error(`Node ${nodeId} (${node.type}) does not support resizing`);
    }

    // #16 — resize() on an instance sublayer reports success and does nothing.
    assertNotInstanceSublayer(
      node,
      'Resizing',
      'Resize the layer on the component master instead, or size this sublayer from its parent ' +
      'with figma_set_layout_align: STRETCH (which works inside instances and preserves variable binds).'
    );

    resolved.push(node);
  }

  // ---- Phase 2: mutate, with bind capture/restore and readback verification ----
  for (const node of resolved) {
    const newWidth = width !== undefined ? width : node.width;
    const newHeight = height !== undefined ? height : node.height;

    const beforeWidth = node.width;
    const beforeHeight = node.height;
    // #17 — capture size binds first; whether resize clears them is undocumented.
    const capturedBinds = captureSizeBinds(node);

    node.resize(newWidth, newHeight);

    const restored = await restoreSizeBinds(node, capturedBinds);
    const nodeWarnings = describeLostBinds(node, restored.lost);

    for (const entry of restored.rebound) {
      reboundAll.push({
        nodeId: node.id,
        field: entry.field,
        variableId: entry.variableId,
        variableName: entry.variableName
      });
    }

    // Verify the size actually changed to what was asked for.
    const widthOk = Math.abs(node.width - newWidth) <= SIZE_EPSILON;
    const heightOk = Math.abs(node.height - newHeight) <= SIZE_EPSILON;

    if (!widthOk || !heightOk) {
      const unchanged =
        Math.abs(node.width - beforeWidth) <= SIZE_EPSILON &&
        Math.abs(node.height - beforeHeight) <= SIZE_EPSILON;

      const detail = `requested ${newWidth}×${newHeight}, node is ${node.width}×${node.height}`;

      if (unchanged) {
        errors.push({
          nodeId: node.id,
          code: 'RESIZE_NO_OP',
          message: `resize() on node ${node.id} ("${node.name}", ${node.type}) did nothing — ${detail}. ` +
            'The size is being controlled elsewhere: check layoutSizingHorizontal/Vertical (HUG/FILL ignore ' +
            'an explicit size), min/max size limits (clear them with figma_set_size_limits), or a parent ' +
            'auto-layout that owns this axis.'
        });
      } else {
        nodeWarnings.push(
          `Resize was clamped on node ${node.id} ("${node.name}") — ${detail}. ` +
          'Likely a min/max size limit (see figma_set_size_limits) or an auto-layout sizing mode.'
        );
      }
    }

    for (const warning of nodeWarnings) {
      warnings.push(warning);
    }

    const serialized = serializeNode(node, 'full');
    serialized.requested = { width: newWidth, height: newHeight };
    serialized.actual = { width: node.width, height: node.height };
    if (restored.rebound.length > 0) serialized.rebound = restored.rebound;
    if (nodeWarnings.length > 0) serialized.warnings = nodeWarnings;
    resizedNodes.push(serialized);
  }

  const result = {
    success: errors.length === 0,
    nodes: resizedNodes,
    notFound
  };
  if (reboundAll.length > 0) result.rebound = reboundAll;
  if (warnings.length > 0) result.warnings = warnings;
  if (errors.length > 0) result.errors = errors;
  return result;
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
 * Show or hide nodes
 * @param {string[]} nodeIds - Array of node IDs
 * @param {boolean} visible - true to show, false to hide
 */
async function setVisible({ nodeIds, visible }) {
  const nodes = [];
  const notFound = [];

  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    if (!('visible' in node)) {
      throw new Error(`Node ${nodeId} (${node.type}) does not support visibility`);
    }

    node.visible = visible;

    nodes.push({
      nodeId: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible
    });
  }

  return {
    success: true,
    nodes,
    notFound
  };
}

/**
 * Set clipsContent on frame-like nodes
 * @param {string[]} nodeIds - Array of node IDs
 * @param {boolean} clipsContent - Whether children are clipped to the frame bounds
 */
async function setClipsContent({ nodeIds, clipsContent }) {
  const resolved = [];
  const notFound = [];

  // Resolve and validate everything before mutating so an unsupported type
  // doesn't leave the batch half-applied.
  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    if (!('clipsContent' in node)) {
      throw new Error(`Node ${nodeId} (${node.type}) does not support clipsContent. Supported types: FRAME, COMPONENT, COMPONENT_SET, INSTANCE, SLOT, SLIDE.`);
    }

    resolved.push(node);
  }

  const nodes = [];
  for (const node of resolved) {
    node.clipsContent = clipsContent;
    nodes.push({
      nodeId: node.id,
      name: node.name,
      type: node.type,
      clipsContent: node.clipsContent
    });
  }

  return {
    success: true,
    nodes,
    notFound
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

  // #17 — changing layoutMode / primaryAxisSizingMode can clear a width/height
  // variable bind (undocumented in both directions). Capture, then restore.
  const capturedBinds = captureSizeBinds(node);

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

  const restored = await restoreSizeBinds(node, capturedBinds);
  const warnings = describeLostBinds(node, restored.lost);

  const result = {
    success: true,
    node: serializeNode(node, 'full')
  };
  if (restored.rebound.length > 0) result.rebound = restored.rebound;
  if (warnings.length > 0) result.warnings = warnings;
  return result;
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

  // Under documentAccess: "dynamic-page" every *StyleId property is READ-ONLY.
  // Assigning throws "Cannot call with documentAccess: dynamic-page. Use
  // node.set...Async instead." — the async setter is mandatory, not optional.
  const asyncSetterMap = {
    fills: 'setFillStyleIdAsync',
    strokes: 'setStrokeStyleIdAsync',
    text: 'setTextStyleIdAsync',
    effects: 'setEffectStyleIdAsync',
    grid: 'setGridStyleIdAsync'
  };

  const styleProperty = propertyMap[property];
  if (!styleProperty) {
    throw new Error(`Invalid property: ${property}`);
  }

  const setterName = asyncSetterMap[property];

  // Check if node supports this style type
  if (!(styleProperty in node)) {
    throw new Error(`Node ${nodeId} (${node.type}) does not support ${property} styles`);
  }

  if (typeof node[setterName] !== 'function') {
    const err = new Error(`Node ${nodeId} (${node.type}) exposes ${styleProperty} but not ${setterName}(), which is required under documentAccess: "dynamic-page". Cannot apply a ${property} style to this node type.`);
    err.code = 'STYLE_SETTER_UNAVAILABLE';
    throw err;
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

  // Apply the style via the async setter, using the style's canonical id
  // (user-supplied ids sometimes omit the trailing comma Figma appends).
  await node[setterName](style.id);

  // Verify the write landed. textStyleId / fillStyleId can read back as
  // figma.mixed (a Symbol) — treat anything non-string as "not applied".
  const applied = node[styleProperty];
  const appliedId = typeof applied === 'string' ? applied : null;

  if (normalizeStyleId(appliedId) !== normalizeStyleId(style.id)) {
    const err = new Error(`${setterName}() reported no error but ${styleProperty} on node ${nodeId} reads back as ${appliedId === null ? 'MIXED/unset' : '"' + appliedId + '"'}, not "${style.id}". The style was NOT applied.`);
    err.code = 'STYLE_NOT_APPLIED';
    throw err;
  }

  return {
    success: true,
    nodeId: node.id,
    property,
    styleId: style.id,
    styleName: style.name,
    // Read back from the node, not echoed from the request — proof of the write.
    appliedStyleId: appliedId,
    verified: true
  };
}

/**
 * Style IDs round-trip with an inconsistent trailing comma ("S:abc," vs "S:abc").
 * Normalize before comparing a readback to a requested id.
 */
function normalizeStyleId(id) {
  if (typeof id !== 'string') return null;
  return id.replace(/,+$/, '');
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

  // x/y are included because measuring child positions is how wrap, row grouping
  // and alignment get verified — without them compact output is unusable for geometry.
  if ('x' in node) {
    result.x = node.x;
    result.y = node.y;
  }

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

  var parent = await resolveNodeById(parentId);
  if (!parent) {
    throw new Error(describeUnresolvedId(parentId));
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
 * Set variable value, or bind a variable to a node property or a style property
 */
async function setVariable(params) {
  var variableId = params.variableId;
  var modeId = params.modeId;
  var value = params.value;
  var nodeId = params.nodeId;
  var styleId = params.styleId;
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

  // Operation 2b: Bind variable to a style property (paint or text style).
  // Checked before the node path so an explicit styleId always wins.
  if (styleId && field) {
    return await bindVariableToStyle(styleId, field, variable, paintIndex);
  }

  // Operation 2: Bind variable to node property
  if (nodeId && field) {
    var node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      // Style IDs (S:...) never resolve as nodes — fall through to the style path
      // rather than reporting a bogus "Node not found".
      return await bindVariableToStyle(nodeId, field, variable, paintIndex);
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

      // Verify — setBoundVariableForPaint returns a copy, so a missed reassign
      // (or a rejected override) would otherwise look like success.
      var verifyPaints = node[field];
      var verifyPaint = Array.isArray(verifyPaints) ? verifyPaints[paintIndex] : null;
      var paintAlias = verifyPaint && verifyPaint.boundVariables ? verifyPaint.boundVariables.color : null;
      if (!paintAlias || paintAlias.id !== variable.id) {
        var paintErr = new Error(
          'Bind of variable "' + variable.name + '" (' + variable.id + ') to ' + field +
          '[' + paintIndex + '] on node ' + node.id + ' did not take effect — the paint reads back ' +
          (paintAlias ? 'bound to ' + paintAlias.id : 'with no color bind') + '. Nothing was changed.'
        );
        paintErr.code = 'BIND_NOT_APPLIED';
        throw paintErr;
      }

      return {
        success: true,
        operation: 'bindToNode',
        variableId: variable.id,
        variableName: variable.name,
        nodeId: node.id,
        field: field,
        paintIndex: paintIndex,
        verified: true,
        boundVariables: clone(node.boundVariables) || {}
      };
    }

    // Standard bindable fields (opacity, cornerRadius, strokeWeight, etc.)
    if (!('setBoundVariable' in node)) {
      throw new Error('Node ' + nodeId + ' (' + node.type + ') does not support setBoundVariable');
    }

    // Special text fields that are valid for setBoundVariable but don't exist directly on the node
    var textBindableFields = ['fontFamily', 'fontStyle', 'fontWeight', 'paragraphSpacing', 'paragraphIndent'];
    var isTextSpecialField = node.type === 'TEXT' && textBindableFields.indexOf(field) !== -1;

    // Validate the field exists on the node (or is a special text field)
    if (!(field in node) && !isTextSpecialField) {
      throw new Error('Node ' + nodeId + ' (' + node.type + ') does not have field "' + field + '"');
    }

    // #15 — a width/height bind on an instance sublayer reports success and does
    // nothing. Block it explicitly rather than papering over Figma's restriction.
    if (field === 'width' || field === 'height') {
      assertNotInstanceSublayer(
        node,
        'Binding a variable to "' + field + '"',
        'Bind ' + field + ' on the component master instead (the instance will inherit it), or let the ' +
        'parent own the size: figma_set_layout_align: STRETCH works inside instances and preserves binds.'
      );
    }

    // Bind the variable
    node.setBoundVariable(field, variable);

    // General anti-silent-failure net: prove the bind landed before claiming
    // success. Applies to every node bind, not just the size fields.
    var landed = readBoundAlias(node, field);
    if (!landed) {
      var missingErr = new Error(
        'Bind of variable "' + variable.name + '" (' + variable.id + ') to "' + field + '" on node ' +
        node.id + ' (' + node.type + ') reported no error but does not read back in ' +
        'node.boundVariables. Nothing was changed.' +
        (findInstanceAncestor(node) ? ' This node is a sublayer of instance "' + findInstanceAncestor(node).name +
          '" — Figma restricts which fields can be overridden inside an instance; bind it on the component master instead.' : '')
      );
      missingErr.code = 'BIND_NOT_APPLIED';
      throw missingErr;
    }

    if (landed.id !== variable.id) {
      var mismatchErr = new Error(
        'Bind of variable "' + variable.name + '" (' + variable.id + ') to "' + field + '" on node ' +
        node.id + ' did not take effect — the field reads back bound to a different variable (' +
        landed.id + ').'
      );
      mismatchErr.code = 'BIND_NOT_APPLIED';
      throw mismatchErr;
    }

    return {
      success: true,
      operation: 'bindToNode',
      variableId: variable.id,
      variableName: variable.name,
      nodeId: node.id,
      field: field,
      verified: true,
      // Read back from the node — proof the bind is live, not an echo of the request.
      boundVariables: clone(node.boundVariables) || {}
    };
  }

  throw new Error('Must provide either (modeId + value) to set variable value, or (nodeId + field) / (styleId + field) to bind variable');
}

// Fields a TextStyle can bind (VariableBindableTextField)
var TEXT_STYLE_BINDABLE_FIELDS = [
  'fontFamily', 'fontSize', 'fontStyle', 'fontWeight',
  'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent'
];

/**
 * Bind a variable to a local style property.
 * TEXT styles use style.setBoundVariable(field, variable).
 * PAINT styles go through figma.variables.setBoundVariableForPaint, which returns a
 * COPY of the paint — the copy must be assigned back onto style.paints or the bind
 * silently does nothing.
 */
async function bindVariableToStyle(styleId, field, variable, paintIndex) {
  var style = await figma.getStyleByIdAsync(styleId);
  if (!style) {
    throw new Error('Node or style not found: ' + styleId);
  }

  if (style.type === 'TEXT') {
    if (TEXT_STYLE_BINDABLE_FIELDS.indexOf(field) === -1) {
      throw new Error('Text styles cannot bind "' + field + '". Bindable fields: ' + TEXT_STYLE_BINDABLE_FIELDS.join(', '));
    }

    style.setBoundVariable(field, variable);

    return {
      success: true,
      operation: 'bindToStyle',
      variableId: variable.id,
      variableName: variable.name,
      styleId: style.id,
      styleName: style.name,
      styleType: style.type,
      field: field,
      boundVariables: clone(style.boundVariables) || {}
    };
  }

  if (style.type === 'PAINT') {
    if (field !== 'paints' && field !== 'color' && field !== 'fills') {
      throw new Error('Paint styles can only bind a color. Use field "paints" (aliases: "color", "fills").');
    }

    if (variable.resolvedType !== 'COLOR') {
      throw new Error('Cannot bind ' + variable.resolvedType + ' variable to a paint style. Only COLOR variables can be bound to paints.');
    }

    var paints = clone(style.paints);
    if (!paints || !paints[paintIndex]) {
      throw new Error('Paint not found at index ' + paintIndex + ' on style ' + styleId);
    }
    if (paints[paintIndex].type !== 'SOLID') {
      throw new Error('Paint at index ' + paintIndex + ' must be a SOLID paint to bind a color variable');
    }

    // Returns a copy — reassigning style.paints is the actual write
    paints[paintIndex] = figma.variables.setBoundVariableForPaint(paints[paintIndex], 'color', variable);
    style.paints = paints;

    return {
      success: true,
      operation: 'bindToStyle',
      variableId: variable.id,
      variableName: variable.name,
      styleId: style.id,
      styleName: style.name,
      styleType: style.type,
      field: 'paints',
      paintIndex: paintIndex,
      boundVariables: clone(style.boundVariables) || {},
      paints: clone(style.paints)
    };
  }

  throw new Error('Style ' + styleId + ' (' + style.type + ') does not support variable binding. Only TEXT and PAINT styles do.');
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
 * Reorder a node (change z-order).
 *
 * `position` is the FINAL index among the node's siblings after the move:
 * 0 is the bottom of the layer stack, children.length - 1 is the top
 * (Figma's `children` array is sorted back-to-front). Out-of-range indices are
 * clamped into range and the response says so.
 *
 * Implementation note: Figma does NOT document whether `insertChild(index, node)`
 * interprets its index before or after the implicit removal when the node is
 * already a child of the same parent — which is exactly the off-by-one that made
 * "index 2" land at 1. There is also no `removeChild` (node.remove() DELETES).
 * So the final sibling order is computed up front and applied with `appendChild`,
 * which is documented as "adds to the end" and therefore has no index ambiguity.
 * Only the suffix that actually changes is re-appended. The result is verified by
 * reading the node's index back out of parent.children.
 */
async function reorderNode({ nodeId, position }) {
  var node = await resolveNodeById(nodeId);
  if (!node) {
    throw new Error(describeUnresolvedId(nodeId));
  }

  // Can't reorder pages or document
  if (node.type === 'PAGE' || node.type === 'DOCUMENT') {
    throw new Error('Cannot reorder ' + node.type + ' nodes');
  }

  var parent = node.parent;
  if (!parent) {
    throw new Error('Node ' + nodeId + ' has no parent');
  }

  // Check if parent supports appendChild
  if (!('children' in parent) || !('appendChild' in parent)) {
    throw new Error('Parent does not support reordering');
  }

  // Figma documents "you can't change the order of children in an instance".
  // Fail up front rather than half-applying the append sequence.
  assertNotInstanceSublayer(
    node,
    'Reordering',
    'Reorder the children on the component master instead — the change flows to every instance.'
  );

  // dynamic-page: children / appendChild on a PageNode need the page loaded first
  if (parent.type === 'PAGE' && typeof parent.loadAsync === 'function') {
    await parent.loadAsync();
  }

  var siblings = parent.children.slice();
  var childCount = siblings.length;
  var oldIndex = siblings.indexOf(node);
  if (oldIndex === -1) {
    throw new Error('Node ' + node.id + ' is not listed among the children of its parent ' + parent.id);
  }

  var targetIndex;
  var clamped = false;

  if (position === 'front') {
    targetIndex = childCount - 1;
  } else if (position === 'back') {
    targetIndex = 0;
  } else if (typeof position === 'number' && isFinite(position)) {
    targetIndex = Math.round(position);
    if (targetIndex < 0) {
      targetIndex = 0;
      clamped = true;
    } else if (targetIndex > childCount - 1) {
      targetIndex = childCount - 1;
      clamped = true;
    }
  } else {
    throw new Error('Invalid position: ' + position + '. Must be "front", "back", or a number.');
  }

  if (oldIndex !== targetIndex) {
    // Desired final order, then append the changed suffix in that order.
    var desired = siblings.slice();
    desired.splice(oldIndex, 1);
    desired.splice(targetIndex, 0, node);

    var start = Math.min(oldIndex, targetIndex);
    for (var i = start; i < desired.length; i++) {
      parent.appendChild(desired[i]);
    }
  }

  // Verify by readback — position is a promise about the final index, so prove it.
  var newIndex = parent.children.indexOf(node);
  if (newIndex !== targetIndex) {
    var err = new Error(
      'Reorder did not take: node ' + node.id + ' ("' + node.name + '") was asked for final index ' +
      targetIndex + ' among ' + parent.children.length + ' siblings of "' + parent.name + '" (' +
      parent.id + ') but reads back at index ' + newIndex + '.'
    );
    err.code = 'REORDER_FAILED';
    err.nodeId = node.id;
    throw err;
  }

  var result = {
    success: true,
    nodeId: node.id,
    parentId: parent.id,
    oldIndex: oldIndex,
    newIndex: newIndex,
    finalIndex: newIndex,
    requestedPosition: position,
    requestedIndex: targetIndex,
    childCount: parent.children.length,
    clamped: clamped,
    verified: true
  };

  if (clamped) {
    result.message = 'Requested index ' + position + ' is outside the sibling range 0..' +
      (childCount - 1) + ' — it was clamped to ' + targetIndex + '.';
  }

  return result;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * figma.editorType has FIVE values, not two: 'figma' | 'figjam' | 'dev' |
 * 'slides' | 'buzz'. Guards must use an explicit allow-list — "not figjam" would
 * wrongly admit Dev Mode, Slides and Buzz, none of which is a design file.
 */
var EDITOR_TYPE_LABELS = {
  figma: 'a Figma Design file',
  figjam: 'a FigJam file',
  dev: 'Figma Dev Mode (read-only for document edits)',
  slides: 'Figma Slides',
  buzz: 'Figma Buzz'
};

/**
 * Human-readable description of the editor the plugin is currently running in.
 */
function describeCurrentEditor() {
  var type = figma.editorType;
  var label = EDITOR_TYPE_LABELS[type];
  if (!label) {
    return 'an unrecognized editor (editorType: "' + type + '")';
  }
  return label + ' (editorType: "' + type + '")';
}

// Commands that never write to the document, so they are allowed in Dev Mode
// (figma.editorType === 'dev'), where the plugin API rejects all document
// mutations. Selection / current-page / viewport changes are not document
// edits and are permitted. get_reactions is listed so its own
// requireFigmaDesign() guard produces the accurate error instead of a
// misleading "read-only" one.
var DEV_MODE_READ_COMMANDS = {
  ping: true,
  get_context: true,
  list_pages: true,
  get_nodes: true,
  get_children: true,
  search_nodes: true,
  search_components: true,
  search_styles: true,
  search_variables: true,
  get_local_styles: true,
  get_local_variables: true,
  export_node: true,
  zoom_to_node: true,
  set_selection: true,
  set_current_page: true,
  get_reactions: true
};

/**
 * Throws if running in Dev Mode and the command mutates the document.
 * Dev Mode plugins get a read-only document — writes throw deep inside the
 * Figma API with unhelpful messages, so this gate fails them up front.
 * @param {string} command - internal command name (MCP tool is figma_<command>)
 */
function requireWritableEditor(command) {
  if (figma.editorType !== 'dev') return;
  if (DEV_MODE_READ_COMMANDS[command]) return;
  var err = new Error(
    'figma_' + command + ' cannot run in Dev Mode — Dev Mode plugins get a read-only ' +
    'document, so every mutation tool is unavailable. The plugin is currently running in ' +
    describeCurrentEditor() + '. ' +
    'Read tools still work here: figma_get_context, figma_list_pages, figma_get_nodes, ' +
    'figma_get_children, the figma_search_* tools, figma_get_local_styles, ' +
    'figma_get_local_variables, and figma_export_node. ' +
    'To edit this file, open it in the Figma Design editor with an editor seat.'
  );
  err.code = 'READ_ONLY_EDITOR';
  err.editorType = figma.editorType;
  err.tool = 'figma_' + command;
  throw err;
}

/**
 * Throws if not running in FigJam. Used to gate FigJam-only commands.
 * @param {string} toolName - MCP tool name, so the error names the tool that failed
 */
function requireFigJam(toolName) {
  if (figma.editorType !== 'figjam') {
    var subject = toolName ? toolName + ' is FigJam only' : 'This command is FigJam only';
    var err = new Error(
      subject + ' — it operates on a FigJam-only node type (STICKY, SHAPE_WITH_TEXT, ' +
      'CONNECTOR, TABLE, CODE_BLOCK, EMBED/LINK_UNFURL), which cannot exist outside FigJam. ' +
      'The plugin is currently running in ' + describeCurrentEditor() + '. ' +
      'Open a FigJam file to use this tool. ' +
      'In a Figma Design file, build the equivalent from FRAME/RECTANGLE/VECTOR/TEXT nodes instead.'
    );
    err.code = 'WRONG_EDITOR';
    err.editorType = figma.editorType;
    err.tool = toolName || null;
    throw err;
  }
}

/**
 * Throws if not running in a Figma Design file. Used to gate Figma-Design-only
 * commands like figma.createPage() — the FigJam plugin runtime simply doesn't
 * expose those APIs, so calling them returns a cryptic "not a function" error.
 * Note the check is `!== 'figma'`, so Dev Mode / Slides / Buzz are rejected too.
 * @param {string} toolName - MCP tool name, so the error names the tool that failed
 */
function requireFigmaDesign(toolName) {
  if (figma.editorType !== 'figma') {
    var subject = toolName ? toolName + ' is Figma Design only' : 'This command is Figma Design only';
    var err = new Error(
      subject + ' — the API it needs is not exposed outside a Figma Design file. ' +
      'The plugin is currently running in ' + describeCurrentEditor() + '. ' +
      'Open a Figma Design file to use this tool.'
    );
    err.code = 'FIGMA_DESIGN_ONLY';
    err.editorType = figma.editorType;
    err.tool = toolName || null;
    throw err;
  }
}

// Node fields whose value Figma refuses to override on an instance sublayer.
// Writing them "succeeds" and changes nothing, so the bridge blocks them up front.
var SIZE_BIND_FIELDS = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'];

/**
 * Walk node.parent upward looking for an INSTANCE ancestor.
 *
 * This is the authoritative check for "is this node an instance sublayer".
 * The `I<instanceId>;<childId>` node-id convention is community lore — it is
 * documented nowhere in Figma's typings or docs — so it is NOT used here.
 *
 * @param {BaseNode} node
 * @returns {InstanceNode|null} the nearest INSTANCE ancestor, or null
 */
function findInstanceAncestor(node) {
  var current = node && node.parent;
  while (current) {
    if (current.type === 'INSTANCE') return current;
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') return null;
    current = current.parent;
  }
  return null;
}

/**
 * Throw INSTANCE_SUBLAYER_RESTRICTED if `node` sits inside an instance.
 * @param {BaseNode} node
 * @param {string} operation - what was attempted, for the message
 * @param {string} remedy - suggested alternative
 */
function assertNotInstanceSublayer(node, operation, remedy) {
  var instance = findInstanceAncestor(node);
  if (!instance) return;

  var err = new Error(
    operation + ' is not possible on node ' + node.id + ' ("' + node.name + '"): it is a sublayer of ' +
    'instance "' + instance.name + '" (' + instance.id + '). Figma does not allow this override on ' +
    'instance sublayers — the call would report success and change nothing. ' + remedy
  );
  err.code = 'INSTANCE_SUBLAYER_RESTRICTED';
  err.nodeId = node.id;
  err.instanceId = instance.id;
  throw err;
}

/**
 * Read the VariableAlias currently bound to `field` on `node`, or null.
 *
 * Two readback quirks are handled:
 *  - text fields (fontSize, lineHeight, ...) come back as VariableAlias[] on nodes
 *  - a cornerRadius bind surfaces on rectangles/frames as the FOUR per-corner keys
 * @returns {{id: string}|null}
 */
function readBoundAlias(node, field) {
  var bound = node.boundVariables;
  if (!bound) return null;

  var value = bound[field];
  if (value === undefined || value === null) {
    if (field === 'cornerRadius') {
      var corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
      for (var i = 0; i < corners.length; i++) {
        var corner = bound[corners[i]];
        if (corner) {
          return Array.isArray(corner) ? (corner.length > 0 ? corner[0] : null) : corner;
        }
      }
    }
    return null;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  return value;
}

/**
 * Snapshot the variable IDs bound to the six size fields on a node.
 * Whether resize() or a layoutMode change clears these is UNDOCUMENTED in both
 * directions, so the bridge captures before, re-reads after, and re-applies.
 * @returns {Object} { [field]: variableId }
 */
function captureSizeBinds(node) {
  var captured = {};
  if (!node || !node.boundVariables) return captured;

  for (var i = 0; i < SIZE_BIND_FIELDS.length; i++) {
    var field = SIZE_BIND_FIELDS[i];
    var alias = readBoundAlias(node, field);
    if (alias && alias.id) {
      captured[field] = alias.id;
    }
  }
  return captured;
}

/**
 * Re-apply any size bind in `captured` that no longer reads back on the node,
 * then verify the re-apply landed.
 * @param {SceneNode} node
 * @param {Object} captured - output of captureSizeBinds()
 * @returns {{rebound: Array, lost: Array}} lost entries are honest failures
 */
async function restoreSizeBinds(node, captured) {
  var rebound = [];
  var lost = [];
  var fields = Object.keys(captured);

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var expectedId = captured[field];

    var current = readBoundAlias(node, field);
    if (current && current.id === expectedId) continue; // survived the mutation

    var variable = null;
    try {
      variable = await figma.variables.getVariableByIdAsync(expectedId);
    } catch (err) {
      variable = null;
    }

    if (!variable) {
      lost.push({ field: field, variableId: expectedId, reason: 'variable could not be resolved' });
      continue;
    }

    try {
      node.setBoundVariable(field, variable);
    } catch (err) {
      lost.push({ field: field, variableId: expectedId, variableName: variable.name, reason: err.message });
      continue;
    }

    var after = readBoundAlias(node, field);
    if (after && after.id === expectedId) {
      rebound.push({ field: field, variableId: expectedId, variableName: variable.name });
    } else {
      lost.push({
        field: field,
        variableId: expectedId,
        variableName: variable.name,
        reason: 'setBoundVariable reported no error but the bind did not read back'
      });
    }
  }

  return { rebound: rebound, lost: lost };
}

/**
 * Turn restoreSizeBinds() "lost" entries into human-readable warnings.
 */
function describeLostBinds(node, lost) {
  return lost.map(function (entry) {
    return 'Variable bind on "' + entry.field + '" (' +
      (entry.variableName ? '"' + entry.variableName + '" ' : '') + entry.variableId +
      ') was destroyed on node ' + node.id + ' ("' + node.name + '") and could NOT be restored: ' +
      entry.reason + '. The node now holds a frozen literal. Re-bind it manually, or size the node ' +
      'with figma_set_layout_align: STRETCH instead, which preserves binds.';
  });
}

/**
 * Build a ConnectorEndpoint object from a flexible spec.
 * Spec shapes:
 *   { nodeId, magnet }                 -> magnet endpoint
 *   { nodeId, position: { x, y } }     -> fixed-position-on-node endpoint
 *   { position: { x, y } }             -> free-floating canvas endpoint
 * Returns null if spec is null/undefined.
 */
function buildConnectorEndpoint(spec) {
  if (!spec) return null;
  if (spec.nodeId) {
    if (spec.position) {
      return { endpointNodeId: spec.nodeId, position: spec.position };
    }
    return { endpointNodeId: spec.nodeId, magnet: spec.magnet || 'AUTO' };
  }
  if (spec.position) {
    return { position: spec.position };
  }
  return null;
}

/**
 * Validate magnet value against connector lineType.
 * STRAIGHT connectors only support CENTER and NONE magnets.
 */
function validateConnectorMagnet(lineType, endpoint) {
  if (!endpoint || !('magnet' in endpoint)) return;
  if (lineType === 'STRAIGHT') {
    if (endpoint.magnet !== 'CENTER' && endpoint.magnet !== 'NONE') {
      var err = new Error('STRAIGHT connectors only support CENTER or NONE magnets (got: ' + endpoint.magnet + ')');
      err.code = 'INVALID_MAGNET';
      throw err;
    }
  }
}

/**
 * Load the font for a TextSublayerNode (sticky/shape/connector/cell).
 *
 * Reads the sublayer's reported fontName when available, else cascades through
 * known FigJam defaults. Connectors use Inter Medium by default; stickies/shapes/
 * cells use Inter Regular. The fontName getter on a freshly-created node can
 * throw or return mixed/unloadable values, so the read is wrapped in try/catch.
 */
async function loadFontForSublayer(textSublayer) {
  try {
    var fontName = textSublayer && textSublayer.fontName;
    if (fontName && fontName !== figma.mixed && fontName.family) {
      await figma.loadFontAsync(fontName);
      return;
    }
  } catch (_) {
    // fall through to defaults
  }
  var fallbacks = [
    { family: 'Inter', style: 'Medium' },
    { family: 'Inter', style: 'Regular' }
  ];
  for (var i = 0; i < fallbacks.length; i++) {
    try {
      await figma.loadFontAsync(fallbacks[i]);
      return;
    } catch (_) {
      // try next
    }
  }
}

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

  // Resolve text target: TEXT node, or TextSublayer for FigJam types
  var target;
  var isSublayer = false;
  if (node.type === 'TEXT') {
    target = node;
  } else if (
    node.type === 'STICKY' ||
    node.type === 'SHAPE_WITH_TEXT' ||
    node.type === 'CONNECTOR' ||
    node.type === 'TABLE_CELL'
  ) {
    target = node.text;
    isSublayer = true;
  } else {
    throw new Error('Node ' + nodeId + ' is not a text-bearing node (type: ' + node.type + ')');
  }

  // Sublayers do not support textAlignVertical
  if (isSublayer && textAlignVertical !== undefined) {
    throw new Error('textAlignVertical cannot be set on a TextSublayer (' + node.type + ')');
  }

  // Determine target font
  var currentFont = target.fontName;
  if (currentFont === figma.mixed) {
    if (!isSublayer) {
      // For mixed fonts on TEXT node, get the first character's font as base
      currentFont = target.getRangeFontName(0, 1);
    } else {
      // Sublayers don't expose getRangeFontName — fall back to Inter
      currentFont = { family: 'Inter', style: 'Regular' };
    }
  }

  var targetFamily = fontFamily || currentFont.family;
  var targetStyle = fontStyle || currentFont.style;

  // Load the font before making changes
  await figma.loadFontAsync({ family: targetFamily, style: targetStyle });

  // Apply font name if changed
  if (fontFamily || fontStyle) {
    target.fontName = { family: targetFamily, style: targetStyle };
  }

  // Apply other properties
  if (fontSize !== undefined) target.fontSize = fontSize;
  if (textCase !== undefined) target.textCase = textCase;
  if (textDecoration !== undefined) target.textDecoration = textDecoration;
  if (lineHeight !== undefined) target.lineHeight = lineHeight;
  if (letterSpacing !== undefined) target.letterSpacing = letterSpacing;
  if (textAlignHorizontal !== undefined) target.textAlignHorizontal = textAlignHorizontal;
  if (!isSublayer && textAlignVertical !== undefined) target.textAlignVertical = textAlignVertical;

  return {
    success: true,
    nodeId: node.id,
    isSublayer: isSublayer,
    fontName: clone(target.fontName),
    fontSize: target.fontSize,
    textCase: target.textCase,
    textDecoration: target.textDecoration,
    lineHeight: clone(target.lineHeight),
    letterSpacing: clone(target.letterSpacing),
    textAlignHorizontal: target.textAlignHorizontal,
    textAlignVertical: isSublayer ? undefined : target.textAlignVertical
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
 * Delete a local style (paint, text, effect or grid)
 */
async function deleteStyle({ styleId }) {
  var style = await figma.getStyleByIdAsync(styleId);
  if (!style) {
    return {
      error: {
        code: 'STYLE_NOT_FOUND',
        message: 'Style not found: ' + styleId
      }
    };
  }

  // remove() only works on local styles — library styles must be unsubscribed instead
  if (style.remote) {
    return {
      error: {
        code: 'REMOTE_STYLE',
        message: 'Cannot delete "' + style.name + '" (' + styleId + '): it belongs to a subscribed library, not this file.'
      }
    };
  }

  var info = {
    styleId: style.id,
    name: style.name,
    type: style.type,
    key: style.key
  };

  style.remove();

  return {
    success: true,
    styleId: info.styleId,
    name: info.name,
    type: info.type,
    key: info.key
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

  // Verify the unbind landed rather than reporting success on faith.
  var stillBound = readBoundAlias(node, field);
  if (stillBound) {
    return {
      error: {
        code: 'UNBIND_FAILED',
        message: 'setBoundVariable(' + field + ', null) reported no error but node ' + node.id +
          ' still reads back bound to ' + stillBound.id + '. Nothing was changed.'
      }
    };
  }

  var response = {
    success: true,
    nodeId: node.id,
    field: field,
    verified: true,
    boundVariables: clone(node.boundVariables) || {}
  };

  // #18 — unbinding a min/max size field leaves the resolved number behind as a
  // hard literal clamp, which is invisible and impossible to undo without a
  // setter. Clear the literal too, and say so.
  if (MIN_MAX_SIZE_FIELDS.indexOf(field) !== -1 && field in node) {
    var residual = node[field];
    response.previousLiteral = residual === undefined ? null : residual;

    if (residual !== null && residual !== undefined) {
      try {
        node[field] = null;
      } catch (clearErr) {
        response.clearedLiteral = false;
        response.warning = 'The variable bind on "' + field + '" was removed, but the resolved literal (' +
          residual + ') could not be cleared: ' + clearErr.message +
          '. That number is still acting as a hard clamp on this node. Clear it with ' +
          'figma_set_size_limits({ nodeIds: ["' + node.id + '"], ' + field + ': null }).';
        return response;
      }

      var afterClear = node[field];
      if (afterClear === null || afterClear === undefined) {
        response.clearedLiteral = true;
        response.note = 'Unbinding "' + field + '" leaves the resolved value behind as a hard literal clamp, ' +
          'so the literal (' + residual + ') was cleared to null as well. Set a new limit with figma_set_size_limits.';
      } else {
        response.clearedLiteral = false;
        response.warning = 'The variable bind on "' + field + '" was removed and the literal was set to null, ' +
          'but it reads back as ' + afterClear + ' — it is still clamping this node. ' +
          'This node may not support min/max size limits (they apply to auto-layout frames and their direct children).';
      }
    } else {
      response.clearedLiteral = false;
      response.note = 'No residual literal was left behind on "' + field + '"; it is already null.';
    }
  }

  return response;
}

// The four clamp fields. Unbinding one leaves its resolved number behind as a
// literal, and `null` is the documented way to clear it.
var MIN_MAX_SIZE_FIELDS = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'];

/**
 * Set or clear explicit min/max size limits on nodes.
 *
 * Documented behavior: minWidth/maxWidth/minHeight/maxHeight are writable, must
 * be positive, and assigning `null` REMOVES the limit. They apply to auto-layout
 * frames and their direct children.
 *
 * @param {string[]} nodeIds - Nodes to update
 * @param {number|null} minWidth  - number to set, null to clear, omit to leave alone
 * @param {number|null} maxWidth
 * @param {number|null} minHeight
 * @param {number|null} maxHeight
 */
async function setSizeLimits(params) {
  var nodeIds = params.nodeIds;

  // Only fields actually present in the payload are touched; `null` means clear.
  var requested = {};
  for (var f = 0; f < MIN_MAX_SIZE_FIELDS.length; f++) {
    var name = MIN_MAX_SIZE_FIELDS[f];
    if (Object.prototype.hasOwnProperty.call(params, name) && params[name] !== undefined) {
      requested[name] = params[name];
    }
  }

  var requestedFields = Object.keys(requested);
  if (requestedFields.length === 0) {
    var noFieldErr = new Error(
      'At least one of minWidth, maxWidth, minHeight, maxHeight must be provided. ' +
      'Pass a number to set a limit, or null to clear it.'
    );
    noFieldErr.code = 'INVALID_PARAMS';
    throw noFieldErr;
  }

  var resolved = [];
  var notFound = [];

  // Validate everything before mutating anything.
  for (var i = 0; i < nodeIds.length; i++) {
    var node = await figma.getNodeByIdAsync(nodeIds[i]);
    if (!node) {
      notFound.push(nodeIds[i]);
      continue;
    }

    for (var v = 0; v < requestedFields.length; v++) {
      if (!(requestedFields[v] in node)) {
        var unsupportedErr = new Error(
          'Node ' + node.id + ' (' + node.type + ') does not support "' + requestedFields[v] + '". ' +
          'Min/max size limits apply to auto-layout frames and their direct children.'
        );
        unsupportedErr.code = 'FIELD_NOT_SUPPORTED';
        throw unsupportedErr;
      }
    }

    resolved.push(node);
  }

  var nodes = [];
  var warnings = [];
  var errors = [];

  for (var n = 0; n < resolved.length; n++) {
    var target = resolved[n];
    var applied = {};
    var nodeWarnings = [];

    var parent = target.parent;
    var selfIsAutoLayout = 'layoutMode' in target && target.layoutMode !== 'NONE';
    var parentIsAutoLayout = !!parent && 'layoutMode' in parent && parent.layoutMode !== 'NONE';
    if (!selfIsAutoLayout && !parentIsAutoLayout) {
      nodeWarnings.push(
        'Node ' + target.id + ' ("' + target.name + '") is neither an auto-layout frame nor a direct child ' +
        'of one. Figma documents min/max size limits as applicable only in those cases, so the value may be ignored.'
      );
    }

    for (var k = 0; k < requestedFields.length; k++) {
      var field = requestedFields[k];
      var value = requested[field];

      // A live variable bind wins over the literal — say so instead of letting
      // the caller believe the number they set is in force.
      var alias = readBoundAlias(target, field);
      if (alias) {
        nodeWarnings.push(
          '"' + field + '" on node ' + target.id + ' is bound to variable ' + alias.id +
          '; the bound value takes precedence over the literal just written. ' +
          'Unbind it first with figma_unbind_variable (which also clears the residual literal).'
        );
      }

      try {
        target[field] = value === undefined ? null : value;
      } catch (err) {
        errors.push({
          nodeId: target.id,
          field: field,
          code: 'SET_FAILED',
          message: 'Setting ' + field + ' to ' + JSON.stringify(value) + ' on node ' + target.id + ' threw: ' + err.message
        });
        continue;
      }

      // Verify the readback — null must clear, a number must stick.
      var readback = target[field];
      applied[field] = readback === undefined ? null : readback;

      var wantsNull = value === null;
      var landedNull = readback === null || readback === undefined;

      if (wantsNull && !landedNull) {
        errors.push({
          nodeId: target.id,
          field: field,
          code: 'LIMIT_NOT_CLEARED',
          message: field + ' on node ' + target.id + ' was set to null but reads back as ' + readback +
            '. The clamp is still in force.'
        });
      } else if (!wantsNull && (landedNull || Math.abs(readback - value) > SIZE_EPSILON)) {
        errors.push({
          nodeId: target.id,
          field: field,
          code: 'LIMIT_NOT_APPLIED',
          message: field + ' on node ' + target.id + ' was set to ' + value + ' but reads back as ' +
            (landedNull ? 'null' : readback) + '. The limit was NOT applied.'
        });
      }
    }

    for (var w = 0; w < nodeWarnings.length; w++) warnings.push(nodeWarnings[w]);

    var entry = {
      nodeId: target.id,
      name: target.name,
      type: target.type,
      // Full readback of all four limits, not just the ones requested.
      minWidth: 'minWidth' in target ? target.minWidth : null,
      maxWidth: 'maxWidth' in target ? target.maxWidth : null,
      minHeight: 'minHeight' in target ? target.minHeight : null,
      maxHeight: 'maxHeight' in target ? target.maxHeight : null,
      width: target.width,
      height: target.height,
      applied: applied
    };
    if (nodeWarnings.length > 0) entry.warnings = nodeWarnings;
    nodes.push(entry);
  }

  var result = {
    success: errors.length === 0,
    nodes: nodes,
    notFound: notFound,
    verified: errors.length === 0
  };
  if (warnings.length > 0) result.warnings = warnings;
  if (errors.length > 0) result.errors = errors;
  return result;
}

/**
 * Pin or unpin an explicit variable mode on nodes (scene nodes and pages).
 * Under documentAccess: "dynamic-page" the setters MUST be handed the collection
 * object — the collectionId overloads throw. Both setters are synchronous.
 * @param {string[]} nodeIds - Nodes (or pages) to pin/unpin
 * @param {string} collectionId - Variable collection the pin applies to
 * @param {string} modeId - Mode to pin (required unless clear is true)
 * @param {boolean} clear - true to remove the pin for this collection
 */
async function setVariableMode({ nodeIds, collectionId, modeId, clear = false }) {
  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    return {
      error: {
        code: 'COLLECTION_NOT_FOUND',
        message: 'Variable collection not found: ' + collectionId
      }
    };
  }

  var mode = null;
  if (!clear) {
    for (var i = 0; i < collection.modes.length; i++) {
      if (collection.modes[i].modeId === modeId) {
        mode = collection.modes[i];
        break;
      }
    }

    if (!mode) {
      var validModes = collection.modes.map(function (m) {
        return m.name + ' (' + m.modeId + ')';
      }).join(', ');
      return {
        error: {
          code: 'MODE_NOT_FOUND',
          message: 'Mode "' + modeId + '" does not belong to collection "' + collection.name + '" (' + collection.id + '). Valid modes: ' + validModes
        }
      };
    }
  }

  var nodes = [];
  var notFound = [];

  for (var j = 0; j < nodeIds.length; j++) {
    var nodeId = nodeIds[j];
    var node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      notFound.push(nodeId);
      continue;
    }

    // Available on every scene node and on PageNode
    if (!('setExplicitVariableModeForCollection' in node)) {
      throw new Error('Node ' + nodeId + ' (' + node.type + ') does not support explicit variable modes');
    }

    if (clear) {
      node.clearExplicitVariableModeForCollection(collection);
    } else {
      node.setExplicitVariableModeForCollection(collection, modeId);
    }

    nodes.push({
      nodeId: node.id,
      name: node.name,
      type: node.type,
      // Echo the readback so the caller can verify the pin in the same call.
      // An empty object means no modes are pinned on this node at all.
      explicitVariableModes: clone(node.explicitVariableModes) || {}
    });
  }

  return {
    success: true,
    operation: clear ? 'clear' : 'set',
    collectionId: collection.id,
    collectionName: collection.name,
    modeId: clear ? undefined : modeId,
    modeName: clear ? undefined : mode.name,
    nodes: nodes,
    notFound: notFound
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
  }
  if ('strokes' in node) {
    base.strokes = clone(node.strokes);
    // strokeWeight is figma.mixed (a Symbol) when per-side weights differ — readStrokeWeight
    // turns that into 'MIXED', and the per-side values are surfaced alongside it.
    if ('strokeWeight' in node) {
      base.strokeWeight = readStrokeWeight(node);
      if (base.strokeWeight === 'MIXED' && 'strokeTopWeight' in node) {
        base.strokeTopWeight = node.strokeTopWeight;
        base.strokeRightWeight = node.strokeRightWeight;
        base.strokeBottomWeight = node.strokeBottomWeight;
        base.strokeLeftWeight = node.strokeLeftWeight;
      }
    }
    if ('strokeAlign' in node) {
      base.strokeAlign = node.strokeAlign;
    }
  }
  if ('effects' in node) {
    base.effects = clone(node.effects);
  }
  if ('opacity' in node) {
    base.opacity = node.opacity;
  }
  if ('blendMode' in node) {
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
    // Wrap settings — only meaningful when layoutMode !== 'NONE'
    if ('layoutWrap' in node) {
      base.layoutWrap = node.layoutWrap;
    }
    // Row gap for wrapped auto-layout; can be null (syncs with itemSpacing)
    if ('counterAxisSpacing' in node) {
      base.counterAxisSpacing = node.counterAxisSpacing;
    }
  }

  // Frame-like nodes: whether children are clipped to the frame bounds
  if ('clipsContent' in node) {
    base.clipsContent = node.clipsContent;
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
    // Only access componentPropertyDefinitions for non-variant components
    // (variant components inside a COMPONENT_SET don't support this property)
    if (!node.parent || node.parent.type !== 'COMPONENT_SET') {
      base.componentPropertyDefinitions = clone(node.componentPropertyDefinitions);
    }
  }
  // Skip mainComponent for now - requires async which complicates serialization
  if (node.type === 'INSTANCE') {
    base.isInstance = true;
  }

  // FigJam-specific node properties
  if (node.type === 'STICKY') {
    if (node.text) {
      base.text = { characters: node.text.characters };
    }
    base.authorVisible = node.authorVisible;
    base.authorName = node.authorName;
    base.isWideWidth = node.isWideWidth;
  } else if (node.type === 'SHAPE_WITH_TEXT') {
    base.shapeType = node.shapeType;
    if (node.text) {
      base.text = { characters: node.text.characters };
    }
  } else if (node.type === 'CONNECTOR') {
    base.connectorLineType = node.connectorLineType;
    base.connectorStart = clone(node.connectorStart);
    base.connectorEnd = clone(node.connectorEnd);
    base.connectorStartStrokeCap = node.connectorStartStrokeCap;
    base.connectorEndStrokeCap = node.connectorEndStrokeCap;
    if (node.text) {
      base.text = { characters: node.text.characters };
    }
  } else if (node.type === 'TABLE') {
    base.numRows = node.numRows;
    base.numColumns = node.numColumns;
  } else if (node.type === 'TABLE_CELL') {
    if (node.text) {
      base.text = { characters: node.text.characters };
    }
    base.rowIndex = node.rowIndex;
    base.columnIndex = node.columnIndex;
  } else if (node.type === 'SECTION') {
    base.sectionContentsHidden = node.sectionContentsHidden;
    base.devStatus = clone(node.devStatus);
  } else if (node.type === 'CODE_BLOCK') {
    base.code = node.code;
    base.codeLanguage = node.codeLanguage;
  } else if (node.type === 'EMBED') {
    base.embedData = clone(node.embedData);
  } else if (node.type === 'LINK_UNFURL') {
    base.linkUnfurlData = clone(node.linkUnfurlData);
  } else if (node.type === 'MEDIA') {
    base.mediaData = clone(node.mediaData);
  } else if (node.type === 'STAMP' || node.type === 'HIGHLIGHT' || node.type === 'WASHI_TAPE') {
    if (node.stuckTo) {
      base.stuckToId = node.stuckTo.id;
    }
  }

  // Connector relationships (FigJam — present on most scene nodes)
  if ('attachedConnectors' in node && node.attachedConnectors) {
    var attached = node.attachedConnectors;
    if (attached.length > 0) {
      base.attachedConnectorIds = attached.map(function(c) { return c.id; });
    }
  }
  if ('stuckNodes' in node && node.stuckNodes) {
    var stuck = node.stuckNodes;
    if (stuck.length > 0) {
      base.stuckNodeIds = stuck.map(function(n) { return n.id; });
    }
  }

  // Node-level variable bindings — { [field]: VariableAlias | VariableAlias[] }
  // Omitted when absent or empty so unbound nodes don't carry a dead key.
  if ('boundVariables' in node && node.boundVariables) {
    var boundVars = clone(node.boundVariables);
    if (boundVars && Object.keys(boundVars).length > 0) {
      base.boundVariables = boundVars;
    }
  }

  // Variable modes pinned on this node — { [collectionId]: modeId }
  // Pins travel through clone/instance, so surface them. Set or clear one with
  // figma_set_variable_mode.
  if ('explicitVariableModes' in node && node.explicitVariableModes) {
    var explicitModes = clone(node.explicitVariableModes);
    if (explicitModes && Object.keys(explicitModes).length > 0) {
      base.explicitVariableModes = explicitModes;
    }
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
  requireFigmaDesign('figma_create_page');
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
  requireFigmaDesign('figma_duplicate_page');
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
 * Set rotation on nodes.
 *
 * `node.rotation = deg` is documented to rotate about the node's TOP-LEFT corner,
 * which moves the node's visual center. pivot: 'center' (the default) instead
 * writes relativeTransform so the visual center stays put.
 *
 * Figma's matrix is row-major [[m00,m01,m02],[m10,m11,m12]] and maps local→parent:
 *   x_p = m00*x + m01*y + m02
 *   y_p = m10*x + m11*y + m12
 * rotation is documented as atan2(-m10, m00), so a rotation of θ has
 * m00 = cos θ, m01 = sin θ, m10 = -sin θ, m11 = cos θ.
 *
 * The existing transform is read first, so the current center is correct even
 * when the node is ALREADY rotated.
 *
 * Caveat handled below: the translation components of relativeTransform are
 * ignored on auto-layout children, so center pivot is impossible there — those
 * nodes get a plain rotation plus a warning rather than a silent wrong result.
 */
async function setRotation({ nodeIds, rotation, pivot }) {
  var rotatedNodes = [];
  var notFound = [];
  var errors = [];
  var warnings = [];

  var requestedPivot = pivot === 'top-left' ? 'top-left' : 'center';

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

    var appliedPivot = 'top-left';
    var warning = null;

    if (requestedPivot === 'center') {
      // Translation is computed by the parent for auto-layout children, so a
      // compensating translation would be discarded. ABSOLUTE-positioned children
      // are exempt — they keep their own translation.
      var parent = node.parent;
      var parentIsAutoLayout = !!parent && 'layoutMode' in parent && parent.layoutMode !== 'NONE';
      var isAbsolute = 'layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE';

      if (parentIsAutoLayout && !isAbsolute) {
        warning = 'Node ' + node.id + ' ("' + node.name + '") could NOT be rotated about its center: its ' +
          'parent "' + parent.name + '" (' + parent.id + ') is an auto-layout frame, which computes this ' +
          'child\'s position itself and ignores the translation part of relativeTransform. Figma applied a ' +
          'top-left pivot instead, so the node\'s visual center moved. To get a true center pivot, set ' +
          'layoutPositioning: ABSOLUTE on the child, or wrap it in a plain (non-auto-layout) frame.';
      } else if (!('relativeTransform' in node) || !node.relativeTransform) {
        warning = 'Node ' + node.id + ' ("' + node.name + '") has no relativeTransform (' + node.type +
          '), so the center pivot could not be applied. Figma rotated it about its top-left corner.';
      } else {
        var rad = (rotation * Math.PI) / 180;
        var cos = Math.cos(rad);
        var sin = Math.sin(rad);
        var transform = node.relativeTransform;
        var halfWidth = node.width / 2;
        var halfHeight = node.height / 2;

        // Current center, in the containing parent's coordinate space.
        var centerX = transform[0][0] * halfWidth + transform[0][1] * halfHeight + transform[0][2];
        var centerY = transform[1][0] * halfWidth + transform[1][1] * halfHeight + transform[1][2];

        // Solve for the translation that maps the local center back onto that point.
        node.relativeTransform = [
          [cos, sin, centerX - cos * halfWidth - sin * halfHeight],
          [-sin, cos, centerY + sin * halfWidth - cos * halfHeight]
        ];
        appliedPivot = 'center';
      }
    }

    if (appliedPivot !== 'center') {
      node.rotation = rotation;
    }

    // Verify the resulting angle. The centre-pivot matrix is derived from
    // Figma's documented rotation === atan2(-m10, m00) rather than an official
    // sample, so a sign error must surface rather than pass silently.
    if (!warning && angleDelta(node.rotation, rotation) > 0.01) {
      warning = 'Node ' + node.id + ' ("' + node.name + '") was asked for a rotation of ' + rotation +
        '° but reads back as ' + node.rotation + '°. The rotation did not apply as requested — ' +
        'treat the position as unverified.';
    }

    if (warning) warnings.push(warning);

    var entry = {
      id: node.id,
      name: node.name,
      type: node.type,
      requestedPivot: requestedPivot,
      appliedPivot: appliedPivot,
      // Read back so the caller can verify the rotation AND where the node ended up.
      rotation: node.rotation,
      absoluteBoundingBox: clone(node.absoluteBoundingBox) || null
    };
    if (warning) entry.warning = warning;
    rotatedNodes.push(entry);
  }

  var result = {
    success: true,
    nodes: rotatedNodes,
    notFound: notFound,
    errors: errors
  };
  if (warnings.length > 0) result.warnings = warnings;
  return result;
}

/**
 * Smallest absolute difference between two angles in degrees, accounting for the
 * ±180 wrap (Figma reports rotation in -180..180, so 180 and -180 are equal).
 */
function angleDelta(a, b) {
  var diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
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

// Combine components as variants into a component set
async function combineAsVariants(params) {
  var componentIds = params.componentIds;

  if (!componentIds || componentIds.length < 2) {
    return { error: { code: 'INVALID_PARAMS', message: 'At least 2 component IDs are required' } };
  }

  // Get all component nodes
  var components = [];
  for (var i = 0; i < componentIds.length; i++) {
    var node = await figma.getNodeByIdAsync(componentIds[i]);
    if (!node) {
      return { error: { code: 'NODE_NOT_FOUND', message: 'Component ' + componentIds[i] + ' not found' } };
    }
    if (node.type !== 'COMPONENT') {
      return { error: { code: 'INVALID_NODE_TYPE', message: 'Node ' + componentIds[i] + ' is not a component (type: ' + node.type + ')' } };
    }
    components.push(node);
  }

  // Combine as variants
  var componentSet = figma.combineAsVariants(components, components[0].parent);

  return {
    success: true,
    componentSet: {
      id: componentSet.id,
      name: componentSet.name,
      type: componentSet.type,
      variantCount: componentSet.children.length,
      variantGroupProperties: componentSet.variantGroupProperties ? clone(componentSet.variantGroupProperties) : {}
    }
  };
}

// ============================================================
// FigJam Commands
// ============================================================

/**
 * Common parent-attachment helper for FigJam node creation.
 */
async function attachToParent(node, parentId) {
  if (parentId) {
    var parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(node);
      return;
    }
  }
  figma.currentPage.appendChild(node);
}

// ---- FigJam: Sticky ----------------------------------------

async function createSticky(params) {
  requireFigJam('figma_create_sticky');
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var text = params.text;
  var fills = params.fills;
  var isWideWidth = params.isWideWidth;
  var parentId = params.parentId;

  // Note: authorName/authorVisible are NOT writable at runtime despite Figma's docs.
  // Figma populates them automatically from the active user; setting throws "no setter for property".

  var sticky = figma.createSticky();
  sticky.x = x;
  sticky.y = y;

  if (isWideWidth !== undefined) sticky.isWideWidth = isWideWidth;
  if (fills) sticky.fills = normalizeFills(fills);

  if (text !== undefined && text !== null) {
    await loadFontForSublayer(sticky.text);
    sticky.text.characters = text;
  }

  await attachToParent(sticky, parentId);

  return { success: true, node: serializeNode(sticky, 'full') };
}

async function setSticky(params) {
  requireFigJam('figma_set_sticky');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) throw new Error('Node not found: ' + params.nodeId);
  if (node.type !== 'STICKY') {
    throw new Error('Node ' + params.nodeId + ' is not a sticky (type: ' + node.type + ')');
  }

  if (params.isWideWidth !== undefined) node.isWideWidth = params.isWideWidth;

  return { success: true, node: serializeNode(node, 'full') };
}

// ---- FigJam: Shape with Text -------------------------------

async function createShapeWithText(params) {
  requireFigJam('figma_create_shape_with_text');
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var width = params.width !== undefined ? params.width : 208;
  var height = params.height !== undefined ? params.height : 208;
  var shapeType = params.shapeType;
  var text = params.text;
  var fills = params.fills;
  var strokes = params.strokes;
  var strokeWeight = params.strokeWeight;
  var parentId = params.parentId;

  if (!shapeType) {
    var err = new Error('shapeType is required');
    err.code = 'INVALID_PARAMS';
    throw err;
  }

  var shape = figma.createShapeWithText();
  // Set shapeType BEFORE positioning/text so the shape's natural geometry is correct
  shape.shapeType = shapeType;
  shape.x = x;
  shape.y = y;
  shape.resize(width, height);

  if (fills) shape.fills = normalizeFills(fills);
  if (strokes) shape.strokes = normalizeFills(strokes);
  if (strokeWeight !== undefined) shape.strokeWeight = strokeWeight;

  if (text !== undefined && text !== null) {
    await loadFontForSublayer(shape.text);
    shape.text.characters = text;
  }

  await attachToParent(shape, parentId);

  return { success: true, node: serializeNode(shape, 'full') };
}

async function setShapeType(params) {
  requireFigJam('figma_set_shape_type');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) throw new Error('Node not found: ' + params.nodeId);
  if (node.type !== 'SHAPE_WITH_TEXT') {
    throw new Error('Node ' + params.nodeId + ' is not a shape-with-text (type: ' + node.type + ')');
  }

  node.shapeType = params.shapeType;

  return { success: true, nodeId: node.id, shapeType: node.shapeType };
}

// ---- FigJam: Connector -------------------------------------

async function createConnector(params) {
  requireFigJam('figma_create_connector');
  var lineType = params.lineType || 'ELBOWED';
  var startCap = params.startCap || 'NONE';
  var endCap = params.endCap || 'ARROW_EQUILATERAL';
  var startEndpoint = buildConnectorEndpoint(params.start);
  var endEndpoint = buildConnectorEndpoint(params.end);
  var text = params.text;
  var strokes = params.strokes;
  var strokeWeight = params.strokeWeight;
  var parentId = params.parentId;

  validateConnectorMagnet(lineType, startEndpoint);
  validateConnectorMagnet(lineType, endEndpoint);

  var connector = figma.createConnector();
  connector.connectorLineType = lineType;

  if (startEndpoint) connector.connectorStart = startEndpoint;
  if (endEndpoint) connector.connectorEnd = endEndpoint;

  connector.connectorStartStrokeCap = startCap;
  connector.connectorEndStrokeCap = endCap;

  if (strokes) connector.strokes = normalizeFills(strokes);
  if (strokeWeight !== undefined) connector.strokeWeight = strokeWeight;

  if (text !== undefined && text !== null && text !== '') {
    await loadFontForSublayer(connector.text);
    connector.text.characters = text;
  }

  await attachToParent(connector, parentId);

  return { success: true, node: serializeNode(connector, 'full') };
}

async function setConnector(params) {
  requireFigJam('figma_set_connector');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) throw new Error('Node not found: ' + params.nodeId);
  if (node.type !== 'CONNECTOR') {
    throw new Error('Node ' + params.nodeId + ' is not a connector (type: ' + node.type + ')');
  }

  // Determine target lineType (use new if provided, else current) for magnet validation
  var lineType = params.lineType !== undefined ? params.lineType : node.connectorLineType;

  if (params.lineType !== undefined) {
    node.connectorLineType = params.lineType;
  }

  if (params.start !== undefined) {
    var startEndpoint = buildConnectorEndpoint(params.start);
    validateConnectorMagnet(lineType, startEndpoint);
    if (startEndpoint) node.connectorStart = startEndpoint;
  }

  if (params.end !== undefined) {
    var endEndpoint = buildConnectorEndpoint(params.end);
    validateConnectorMagnet(lineType, endEndpoint);
    if (endEndpoint) node.connectorEnd = endEndpoint;
  }

  if (params.startCap !== undefined) {
    node.connectorStartStrokeCap = params.startCap;
  }
  if (params.endCap !== undefined) {
    node.connectorEndStrokeCap = params.endCap;
  }

  if (params.text !== undefined) {
    await loadFontForSublayer(node.text);
    node.text.characters = params.text;
  }

  return { success: true, node: serializeNode(node, 'full') };
}

// ---- FigJam (and Figma): Section ---------------------------

async function createSection(params) {
  // Sections work in BOTH editors — no requireFigJam() guard
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var width = params.width !== undefined ? params.width : 600;
  var height = params.height !== undefined ? params.height : 400;
  var name = params.name;
  var fills = params.fills;
  var sectionContentsHidden = params.sectionContentsHidden;
  var devStatus = params.devStatus;
  var devStatusDescription = params.devStatusDescription;
  var parentId = params.parentId;

  var section = figma.createSection();
  if (name) section.name = name;
  section.x = x;
  section.y = y;

  if ('resizeWithoutConstraints' in section) {
    section.resizeWithoutConstraints(width, height);
  } else if ('resize' in section) {
    section.resize(width, height);
  }

  if (fills) section.fills = normalizeFills(fills);
  if (sectionContentsHidden !== undefined) {
    section.sectionContentsHidden = sectionContentsHidden;
  }

  await attachToParent(section, parentId);

  // devStatus must be applied after the section has its final parent
  // (it can only be set on nodes directly under a page or section)
  var devStatusError = null;
  if (devStatus) {
    try {
      section.devStatus = { type: devStatus, description: devStatusDescription || '' };
    } catch (e) {
      devStatusError = e.message;
    }
  }

  var result = { success: true, node: serializeNode(section, 'full') };
  if (devStatusError) result.devStatusError = devStatusError;
  return result;
}

async function setSection(params) {
  // Works in both editors
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) throw new Error('Node not found: ' + params.nodeId);
  if (node.type !== 'SECTION') {
    throw new Error('Node ' + params.nodeId + ' is not a section (type: ' + node.type + ')');
  }

  if (params.name !== undefined) node.name = params.name;
  if (params.sectionContentsHidden !== undefined) {
    node.sectionContentsHidden = params.sectionContentsHidden;
  }
  if (params.devStatus !== undefined) {
    if (params.devStatus === null) {
      node.devStatus = null;
    } else {
      node.devStatus = { type: params.devStatus, description: params.devStatusDescription || '' };
    }
  }

  return { success: true, node: serializeNode(node, 'full') };
}

// ---- FigJam: Table -----------------------------------------

async function createTable(params) {
  requireFigJam('figma_create_table');
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var numRows = params.numRows !== undefined ? params.numRows : 2;
  var numColumns = params.numColumns !== undefined ? params.numColumns : 2;
  var cells = params.cells;
  var fills = params.fills;
  var parentId = params.parentId;

  var table = figma.createTable(numRows, numColumns);
  table.x = x;
  table.y = y;

  if (fills) table.fills = normalizeFills(fills);

  if (cells && cells.length > 0) {
    // Load font from the first cell's text sublayer; it covers all cells in a fresh table.
    await loadFontForSublayer(table.cellAt(0, 0).text);

    for (var i = 0; i < cells.length; i++) {
      var spec = cells[i];
      if (
        spec.row >= 0 && spec.row < table.numRows &&
        spec.column >= 0 && spec.column < table.numColumns
      ) {
        var cell = table.cellAt(spec.row, spec.column);
        if (spec.text !== undefined && spec.text !== null) {
          cell.text.characters = spec.text;
        }
        if (spec.fills) {
          cell.fills = normalizeFills(spec.fills);
        }
      }
    }
  }

  await attachToParent(table, parentId);

  return { success: true, node: serializeNode(table, 'full') };
}

async function setTableCell(params) {
  requireFigJam('figma_set_table_cell');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) throw new Error('Node not found: ' + params.nodeId);
  if (node.type !== 'TABLE') {
    throw new Error('Node ' + params.nodeId + ' is not a table (type: ' + node.type + ')');
  }

  if (params.row < 0 || params.row >= node.numRows) {
    throw new Error('row ' + params.row + ' out of bounds (table has ' + node.numRows + ' rows)');
  }
  if (params.column < 0 || params.column >= node.numColumns) {
    throw new Error('column ' + params.column + ' out of bounds (table has ' + node.numColumns + ' columns)');
  }

  var cell = node.cellAt(params.row, params.column);

  if (params.text !== undefined) {
    await loadFontForSublayer(cell.text);
    cell.text.characters = params.text;
  }
  if (params.fills) {
    cell.fills = normalizeFills(params.fills);
  }

  return { success: true, cell: serializeNode(cell, 'full') };
}

async function getTableNode(nodeId) {
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) throw new Error('Node not found: ' + nodeId);
  if (node.type !== 'TABLE') {
    throw new Error('Node ' + nodeId + ' is not a table (type: ' + node.type + ')');
  }
  return node;
}

async function insertTableRow(params) {
  requireFigJam('figma_insert_table_row');
  var table = await getTableNode(params.nodeId);
  table.insertRow(params.rowIndex);
  return {
    success: true,
    nodeId: table.id,
    numRows: table.numRows,
    numColumns: table.numColumns
  };
}

async function insertTableColumn(params) {
  requireFigJam('figma_insert_table_column');
  var table = await getTableNode(params.nodeId);
  table.insertColumn(params.columnIndex);
  return {
    success: true,
    nodeId: table.id,
    numRows: table.numRows,
    numColumns: table.numColumns
  };
}

async function removeTableRow(params) {
  requireFigJam('figma_remove_table_row');
  var table = await getTableNode(params.nodeId);
  table.removeRow(params.rowIndex);
  return {
    success: true,
    nodeId: table.id,
    numRows: table.numRows,
    numColumns: table.numColumns
  };
}

async function removeTableColumn(params) {
  requireFigJam('figma_remove_table_column');
  var table = await getTableNode(params.nodeId);
  table.removeColumn(params.columnIndex);
  return {
    success: true,
    nodeId: table.id,
    numRows: table.numRows,
    numColumns: table.numColumns
  };
}

async function resizeTableRow(params) {
  requireFigJam('figma_resize_table_row');
  var table = await getTableNode(params.nodeId);
  table.resizeRow(params.rowIndex, params.height);
  return {
    success: true,
    nodeId: table.id,
    rowIndex: params.rowIndex,
    height: params.height
  };
}

async function resizeTableColumn(params) {
  requireFigJam('figma_resize_table_column');
  var table = await getTableNode(params.nodeId);
  table.resizeColumn(params.columnIndex, params.width);
  return {
    success: true,
    nodeId: table.id,
    columnIndex: params.columnIndex,
    width: params.width
  };
}

async function moveTableRow(params) {
  requireFigJam('figma_move_table_row');
  var table = await getTableNode(params.nodeId);
  table.moveRow(params.fromIndex, params.toIndex);
  return {
    success: true,
    nodeId: table.id,
    fromIndex: params.fromIndex,
    toIndex: params.toIndex
  };
}

async function moveTableColumn(params) {
  requireFigJam('figma_move_table_column');
  var table = await getTableNode(params.nodeId);
  table.moveColumn(params.fromIndex, params.toIndex);
  return {
    success: true,
    nodeId: table.id,
    fromIndex: params.fromIndex,
    toIndex: params.toIndex
  };
}

// ---- FigJam: Code Block ------------------------------------

async function createCodeBlock(params) {
  requireFigJam('figma_create_code_block');
  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var code = params.code !== undefined ? params.code : '';
  var codeLanguage = params.codeLanguage || 'PLAINTEXT';
  var parentId = params.parentId;

  // CodeBlockNode.code setter requires Source Code Pro Medium to be loaded
  await figma.loadFontAsync({ family: 'Source Code Pro', style: 'Medium' });

  var block = figma.createCodeBlock();
  block.x = x;
  block.y = y;
  block.code = code;
  block.codeLanguage = codeLanguage;

  await attachToParent(block, parentId);

  return { success: true, node: serializeNode(block, 'full') };
}

async function setCodeBlock(params) {
  requireFigJam('figma_set_code_block');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) throw new Error('Node not found: ' + params.nodeId);
  if (node.type !== 'CODE_BLOCK') {
    throw new Error('Node ' + params.nodeId + ' is not a code block (type: ' + node.type + ')');
  }

  if (params.code !== undefined) {
    // Same font requirement as creation
    await figma.loadFontAsync({ family: 'Source Code Pro', style: 'Medium' });
    node.code = params.code;
  }
  if (params.codeLanguage !== undefined) node.codeLanguage = params.codeLanguage;

  return { success: true, node: serializeNode(node, 'full') };
}

// ---- FigJam: Link Preview (Embed / Link Unfurl) ------------

async function createLinkPreview(params) {
  requireFigJam('figma_create_link_preview');
  if (!params.url) {
    var err = new Error('url is required');
    err.code = 'INVALID_PARAMS';
    throw err;
  }

  var x = params.x !== undefined ? params.x : 0;
  var y = params.y !== undefined ? params.y : 0;
  var parentId = params.parentId;

  var node = await figma.createLinkPreviewAsync(params.url);
  if ('x' in node) {
    node.x = x;
    node.y = y;
  }

  await attachToParent(node, parentId);

  return {
    success: true,
    nodeType: node.type,
    node: serializeNode(node, 'full')
  };
}

// ============================================================
// Prototype command implementations
// ============================================================

async function getReactions(params) {
  requireFigmaDesign('figma_get_reactions');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    var err = new Error('Node not found: ' + params.nodeId);
    err.code = 'NODE_NOT_FOUND';
    throw err;
  }
  if (!('reactions' in node)) {
    var err2 = new Error('Node type ' + node.type + ' does not support reactions');
    err2.code = 'INVALID_PARAMS';
    throw err2;
  }
  return { success: true, nodeId: node.id, reactions: node.reactions };
}

async function addReaction(params) {
  requireFigmaDesign('figma_add_reaction');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    var err = new Error('Node not found: ' + params.nodeId);
    err.code = 'NODE_NOT_FOUND';
    throw err;
  }
  if (!('reactions' in node) || !('setReactionsAsync' in node)) {
    var err2 = new Error('Node type ' + node.type + ' does not support reactions');
    err2.code = 'INVALID_PARAMS';
    throw err2;
  }

  var trigger = buildTrigger(params.trigger);
  var action = buildAction(params.action);
  // Use actions[] (new API); action field is deprecated
  var newReaction = { trigger: trigger, actions: [action] };

  var existing = node.reactions.map(function(r) { return safeClone(r); });
  existing.push(newReaction);
  await node.setReactionsAsync(existing);

  return { success: true, nodeId: node.id, reactions: node.reactions };
}

async function removeReaction(params) {
  requireFigmaDesign('figma_remove_reaction');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    var err = new Error('Node not found: ' + params.nodeId);
    err.code = 'NODE_NOT_FOUND';
    throw err;
  }
  if (!('reactions' in node) || !('setReactionsAsync' in node)) {
    var err2 = new Error('Node type ' + node.type + ' does not support reactions');
    err2.code = 'INVALID_PARAMS';
    throw err2;
  }

  var idx = params.index;
  var current = node.reactions.map(function(r) { return safeClone(r); });
  if (idx < 0 || idx >= current.length) {
    var err3 = new Error('Reaction index ' + idx + ' out of range (length: ' + current.length + ')');
    err3.code = 'INVALID_PARAMS';
    throw err3;
  }
  current.splice(idx, 1);
  await node.setReactionsAsync(current);

  return { success: true, nodeId: node.id, reactions: node.reactions };
}

async function setFlowStartingPoint(params) {
  requireFigmaDesign('figma_set_flow_starting_point');
  var node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    var err = new Error('Node not found: ' + params.nodeId);
    err.code = 'NODE_NOT_FOUND';
    throw err;
  }
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
    var err2 = new Error('Flow starting points can only be set on FRAME, COMPONENT, or COMPONENT_SET nodes (got ' + node.type + ')');
    err2.code = 'INVALID_PARAMS';
    throw err2;
  }

  // Flow starting points live on the PAGE, not the frame. The Figma typings mark
  // PageNode.flowStartingPoints as ReadonlyArray, but the runtime accepts direct
  // assignment of a new array — that's the documented (if quirky) pattern.
  var page = getPageForNode(node);
  if (!page) {
    var err3 = new Error('Could not find parent page for node ' + params.nodeId);
    err3.code = 'OPERATION_FAILED';
    throw err3;
  }

  var current = page.flowStartingPoints.map(function(fp) {
    return { nodeId: fp.nodeId, name: fp.name };
  });

  if (params.clear) {
    var filtered = current.filter(function(fp) { return fp.nodeId !== node.id; });
    page.flowStartingPoints = filtered;
    return { success: true, nodeId: node.id, cleared: true, flowStartingPoints: page.flowStartingPoints };
  }

  var flowName = params.flowName || 'Flow 1';
  var entry = { nodeId: node.id, name: flowName };
  var existingIdx = -1;
  for (var i = 0; i < current.length; i++) {
    if (current[i].nodeId === node.id) { existingIdx = i; break; }
  }
  if (existingIdx >= 0) {
    current[existingIdx] = entry;
  } else {
    current.push(entry);
  }
  page.flowStartingPoints = current;

  return { success: true, nodeId: node.id, flowStartingPoints: page.flowStartingPoints };
}

// ---- Prototype helpers ----

function buildTrigger(t) {
  var trigger = { type: t.type };
  if (t.type === 'AFTER_TIMEOUT') {
    trigger.timeout = t.timeout !== undefined ? t.timeout : 0;
  }
  if (t.type === 'ON_KEY_DOWN') {
    trigger.device = t.device || 'KEYBOARD';
    trigger.keyCodes = t.keyCodes || [];
  }
  if (t.type === 'ON_MEDIA_HIT') {
    trigger.mediaHitTime = t.mediaHitTime !== undefined ? t.mediaHitTime : 0;
  }
  if (t.type === 'MOUSE_UP' || t.type === 'MOUSE_DOWN') {
    trigger.delay = t.delay !== undefined ? t.delay : 0;
  }
  if (t.type === 'MOUSE_ENTER' || t.type === 'MOUSE_LEAVE') {
    trigger.delay = t.delay !== undefined ? t.delay : 0;
    // NOTE: `deprecatedVersion` is in @figma/plugin-typings but the current runtime
    // rejects it with "Unrecognized key(s) in object: 'deprecatedVersion'". Do not send.
  }
  return trigger;
}

function buildAction(a) {
  // BACK and CLOSE have no extra fields
  if (a.type === 'BACK' || a.type === 'CLOSE') {
    return { type: a.type };
  }

  // URL action
  if (a.type === 'URL') {
    var urlAction = { type: 'URL', url: a.url || '' };
    if (a.openInNewTab !== undefined) {
      urlAction.openInNewTab = a.openInNewTab;
    }
    return urlAction;
  }

  // NODE action — covers NAVIGATE, OVERLAY, SCROLL_TO, SWAP, CHANGE_TO via navigation field
  var action = {
    type: 'NODE',
    destinationId: a.destinationId !== undefined ? a.destinationId : null,
    navigation: a.navigation || 'NAVIGATE',
    transition: a.transition !== undefined ? buildTransition(a.transition) : null,
    preserveScrollPosition: a.preserveScrollPosition !== undefined ? a.preserveScrollPosition : false
  };
  if (a.overlayRelativePosition !== undefined) {
    action.overlayRelativePosition = a.overlayRelativePosition;
  }
  return action;
}

function buildTransition(t) {
  var transition = {
    type: t.type,
    duration: t.duration !== undefined ? t.duration : 0.3,
    easing: t.easing ? Object.assign({}, t.easing) : { type: 'LINEAR' }
  };
  // Directional transitions (MOVE_IN/MOVE_OUT/PUSH/SLIDE_IN/SLIDE_OUT) require
  // matchLayers — Figma's setReactionsAsync validator rejects them without it.
  var isDirectional = t.type === 'MOVE_IN' || t.type === 'MOVE_OUT' ||
                      t.type === 'PUSH' || t.type === 'SLIDE_IN' || t.type === 'SLIDE_OUT';
  if (isDirectional) {
    transition.direction = t.direction;
    transition.matchLayers = t.matchLayers !== undefined ? t.matchLayers : false;
  }
  return transition;
}
