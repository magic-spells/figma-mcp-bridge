/**
 * figma_get_nodes tool
 * Returns detailed information about specific nodes by their IDs
 */

export const nodesTool = {
  name: 'figma_get_nodes',
  description: 'Get detailed information about specific Figma nodes by their IDs. Returns node properties including type, position, size, fills, strokes, auto-layout (including layoutWrap and counterAxisSpacing), clipsContent, node-level boundVariables, explicitVariableModes, and more.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of Figma node IDs (e.g., ["1:23", "4:56"])'
      }
    },
    required: ['nodeIds']
  }
};

export async function handleGetNodes(bridge, args) {
  if (!bridge.isConnected()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'NOT_CONNECTED',
            message: 'Figma plugin is not connected. Please open Figma and run the Claude Bridge plugin.'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  const { nodeIds, depth } = args;

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'INVALID_PARAMS',
            message: 'nodeIds must be a non-empty array of node IDs'
          }
        }, null, 2)
      }],
      isError: true
    };
  }

  try {
    const result = await bridge.sendCommand('get_nodes', { nodeIds, depth });

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
