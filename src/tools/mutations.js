/**
 * Mutation tools - tools that modify the Figma document
 */

/**
 * Set fills on a node
 */
export async function handleSetFills(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, fills } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_fills', { nodeId, fills });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set strokes on a node
 */
export async function handleSetStrokes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, strokes, strokeWeight } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_strokes', { nodeId, strokes, strokeWeight });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a rectangle
 */
export async function handleCreateRectangle(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_rectangle', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set text content
 */
export async function handleSetText(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, text } = args;

  if (!nodeId || text === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId and text are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_text', { nodeId, text });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Clone nodes
 */
export async function handleCloneNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, parentId, offset } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('clone_nodes', { nodeIds, parentId, offset });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Delete nodes
 */
export async function handleDeleteNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('delete_nodes', { nodeIds });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Move nodes
 */
export async function handleMoveNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, x, y, relative } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (x === undefined && y === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'At least one of x or y must be provided'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('move_nodes', { nodeIds, x, y, relative });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Resize nodes
 */
export async function handleResizeNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, width, height } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (width === undefined && height === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'At least one of width or height must be provided'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('resize_nodes', { nodeIds, width, height });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set opacity
 */
export async function handleSetOpacity(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, opacity } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (opacity === undefined || opacity < 0 || opacity > 1) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'opacity must be a number between 0 and 1'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_opacity', { nodeId, opacity });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set corner radius
 */
export async function handleSetCornerRadius(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, radius, topLeft, topRight, bottomLeft, bottomRight } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (radius === undefined && topLeft === undefined && topRight === undefined && bottomLeft === undefined && bottomRight === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'At least one radius value must be provided'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_corner_radius', { nodeId, radius, topLeft, topRight, bottomLeft, bottomRight });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Group nodes
 */
export async function handleGroupNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, name } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('group_nodes', { nodeIds, name });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Ungroup nodes
 */
export async function handleUngroupNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('ungroup_nodes', { nodeIds });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a frame
 */
export async function handleCreateFrame(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_frame', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a text node
 */
export async function handleCreateText(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_text', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set selection
 */
export async function handleSetSelection(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds } = args;

  if (!nodeIds || !Array.isArray(nodeIds)) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be an array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_selection', { nodeIds });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set current page
 */
export async function handleSetCurrentPage(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { pageId } = args;

  if (!pageId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'pageId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_current_page', { pageId });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Export node as image
 */
export async function handleExportNode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, format, scale } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('export_node', { nodeId, format, scale });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// New Commands (Phase 2)
// ============================================================

/**
 * Create an ellipse
 */
export async function handleCreateEllipse(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_ellipse', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set effects on a node
 */
export async function handleSetEffects(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, effects } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!effects || !Array.isArray(effects)) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'effects must be an array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_effects', { nodeId, effects });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set auto-layout on a frame
 */
export async function handleSetAutoLayout(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_auto_layout', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Get local styles
 */
export async function handleGetLocalStyles(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('get_local_styles', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Apply a style to a node
 */
export async function handleApplyStyle(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, styleId, property } = args;

  if (!nodeId || !styleId || !property) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId, styleId, and property are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('apply_style', { nodeId, styleId, property });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a component
 */
export async function handleCreateComponent(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_component', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create an instance of a component
 */
export async function handleCreateInstance(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { componentId } = args;

  if (!componentId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'componentId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_instance', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Phase 3 Commands: Variables, Lines, Constraints
// ============================================================

/**
 * Get local variables and variable collections
 */
export async function handleGetLocalVariables(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('get_local_variables', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Search variables with filtering (optimized for reduced token usage)
 */
export async function handleSearchVariables(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('search_variables', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set variable value or bind variable to node
 */
export async function handleSetVariable(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { variableId, modeId, value, nodeId, field } = args;

  if (!variableId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'variableId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  // Validate: either (modeId + value) for setting, or (nodeId + field) for binding
  if (value !== undefined && !modeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'modeId is required when setting a value'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (nodeId && !field) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'field is required when binding to a node'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_variable', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a line
 */
export async function handleCreateLine(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_line', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set constraints on a node
 */
export async function handleSetConstraints(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, horizontal, vertical } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (horizontal === undefined && vertical === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'At least one of horizontal or vertical must be provided'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_constraints', { nodeId, horizontal, vertical });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Phase 4 Commands: Polygons, Boolean Operations, Viewport, Blend Mode, Detach
// ============================================================

/**
 * Create a polygon or star
 */
export async function handleCreatePolygon(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_polygon', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Perform boolean operation on nodes
 */
export async function handleBooleanOperation(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { operation, nodeIds } = args;

  if (!operation) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'operation is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length < 2) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be an array with at least 2 nodes'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('boolean_operation', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Zoom viewport to node(s)
 */
export async function handleZoomToNode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('zoom_to_node', { nodeIds });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set blend mode on a node
 */
export async function handleSetBlendMode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, blendMode } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!blendMode) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'blendMode is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_blend_mode', { nodeId, blendMode });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Detach instance from component
 */
export async function handleDetachInstance(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('detach_instance', { nodeId });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Phase 5 Commands: Layout Align, Vector, Rename, Reorder
// ============================================================

/**
 * Set layout align properties on a node (for auto-layout children)
 */
export async function handleSetLayoutAlign(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_layout_align', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a vector with custom path data
 */
export async function handleCreateVector(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { data } = args;

  if (!data) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'data (SVG path string) is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_vector', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Rename one or more nodes
 */
export async function handleRenameNode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, nodeIds, name } = args;

  if (!nodeId && (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0)) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId or nodeIds is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'name is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('rename_node', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Reorder a node (change z-order)
 */
export async function handleReorderNode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, position } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (position === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'position is required (front, back, or index number)'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('reorder_node', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Smart Query Commands (token-efficient search)
// ============================================================

/**
 * Search nodes by name within a scope
 */
export async function handleSearchNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { parentId } = args;

  if (!parentId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'parentId is required to scope the search'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('search_nodes', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Search local components by name
 */
export async function handleSearchComponents(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('search_components', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Search local styles by name
 */
export async function handleSearchStyles(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('search_styles', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Get immediate children of a node
 */
export async function handleGetChildren(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { parentId } = args;

  if (!parentId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'parentId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('get_children', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set text style properties on an existing text node
 */
export async function handleSetTextStyle(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_text_style', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a new local paint style
 */
export async function handleCreatePaintStyle(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { name, fills } = args;

  if (!name || !fills) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'name and fills are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_paint_style', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a new local text style
 */
export async function handleCreateTextStyle(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { name } = args;

  if (!name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'name is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_text_style', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a new variable collection
 */
export async function handleCreateVariableCollection(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { name } = args;

  if (!name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'name is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_variable_collection', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Create a new variable in a collection
 */
export async function handleCreateVariable(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { collectionId, name, type } = args;

  if (!collectionId || !name || !type) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'collectionId, name, and type are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_variable', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Rename an existing variable
 */
export async function handleRenameVariable(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { variableId, name } = args;

  if (!variableId || !name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'variableId and name are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('rename_variable', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Delete one or more variables
 */
export async function handleDeleteVariables(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { variableIds } = args;

  if (!variableIds || !Array.isArray(variableIds) || variableIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'variableIds array is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('delete_variables', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Delete a variable collection
 */
export async function handleDeleteVariableCollection(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { collectionId } = args;

  if (!collectionId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'collectionId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('delete_variable_collection', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Rename a variable collection
 */
export async function handleRenameVariableCollection(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { collectionId, name } = args;

  if (!collectionId || !name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'collectionId and name are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('rename_variable_collection', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Rename a mode in a variable collection
 */
export async function handleRenameMode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { collectionId, modeId, name } = args;

  if (!collectionId || !modeId || !name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'collectionId, modeId, and name are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('rename_mode', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Add a mode to a variable collection
 */
export async function handleAddMode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { collectionId, name } = args;

  if (!collectionId || !name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'collectionId and name are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('add_mode', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Delete a mode from a variable collection
 */
export async function handleDeleteMode(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { collectionId, modeId } = args;

  if (!collectionId || !modeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'collectionId and modeId are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('delete_mode', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Unbind a variable from a node property
 */
export async function handleUnbindVariable(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, field } = args;

  if (!nodeId || !field) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId and field are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('unbind_variable', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Page Management Commands
// ============================================================

/**
 * Create a new page
 */
export async function handleCreatePage(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { name } = args;

  if (!name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'name is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('create_page', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Rename a page
 */
export async function handleRenamePage(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { pageId, name } = args;

  if (!pageId || !name) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'pageId and name are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('rename_page', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Delete a page
 */
export async function handleDeletePage(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { pageId } = args;

  if (!pageId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'pageId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('delete_page', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Reorder a page (change its position in the page list)
 */
export async function handleReorderPage(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { pageId, index } = args;

  if (!pageId || index === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'pageId and index are required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('reorder_page', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Node Structure Commands
// ============================================================

/**
 * Reparent nodes - move nodes to a different parent
 */
export async function handleReparentNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, newParentId } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!newParentId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'newParentId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('reparent_nodes', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Move nodes to a different page
 */
export async function handleMoveToPage(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, targetPageId } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!targetPageId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'targetPageId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('move_to_page', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Component Instance Commands
// ============================================================

/**
 * Swap an instance to use a different component
 */
export async function handleSwapInstance(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { instanceId, newComponentId } = args;

  if (!instanceId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'instanceId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!newComponentId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'newComponentId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('swap_instance', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

// ============================================================
// Additional Commands
// ============================================================

/**
 * Duplicate a page - clone entire page with all contents
 */
export async function handleDuplicatePage(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { pageId } = args;

  if (!pageId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'pageId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('duplicate_page', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set rotation on nodes
 */
export async function handleSetRotation(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, rotation } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (rotation === undefined) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'rotation is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_rotation', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Set layout grids on a frame
 */
export async function handleSetLayoutGrids(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeId, layoutGrids } = args;

  if (!nodeId) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeId is required'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  if (!layoutGrids || !Array.isArray(layoutGrids)) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'layoutGrids must be an array'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('set_layout_grids', args);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message
          }
        }, null, 2)
      }],
      isError: true
    };
  }
}
