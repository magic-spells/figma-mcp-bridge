/**
 * MCP Server setup
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerTools } from './tools/index.js';

// Read package.json once at module load so version stays in sync with the published artifact
const __dirname = dirname(fileURLToPath(import.meta.url));
let pkgVersion = '0.0.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  pkgVersion = pkg.version;
} catch (_) {
  // Fall back to placeholder if package.json can't be read
}

/**
 * Create and configure the MCP server
 * @param {FigmaBridge} bridge - Figma bridge instance (must be started — bridge.port must reflect the bound port)
 * @returns {McpServer} Configured MCP server
 */
export function createServer(bridge) {
  const port = bridge.port;
  const server = new McpServer({
    name: 'figma-mcp-bridge',
    version: pkgVersion,
    instructions: `# Figma MCP Bridge v${pkgVersion}

## CONNECTION INFO — CHECK FIRST

This MCP server is bridging Claude to Figma via a WebSocket on **port ${port}**.

Multiple Claude sessions can run concurrently and the bridge falls back through ports 3055–3070, so the port may differ from the default. **At the start of any new Figma-related conversation, call \`figma_get_context\` to check connection state. If it returns \`connected: false\`, proactively tell the user:**

> "The Figma MCP bridge is running on port **${port}**. Open the Figma plugin and set its port input to **${port}**, then re-run the plugin if it was already open."

Don't make the user discover the port themselves — surface it the first time you notice they aren't connected.

## FigJam Support

This server supports both Figma design files AND FigJam files. FigJam-specific tools (sticky notes, flowchart shapes, connectors, tables, code blocks, link previews) are gated to FigJam files and return a \`WRONG_EDITOR\` error if called against a Figma design file.

**Editor-restricted tools:**
- FigJam-only (return \`WRONG_EDITOR\` in design files): all sticky / shape-with-text / connector / table / code-block / link-preview tools
- Figma Design only (return \`FIGMA_DESIGN_ONLY\` in FigJam): \`figma_create_page\`, \`figma_duplicate_page\`. FigJam files have pages but the plugin API does not expose page creation; pages must be created via the FigJam UI by the user.

For flowcharts in FigJam:
- \`figma_create_shape_with_text\` with \`shapeType\` (ROUNDED_RECTANGLE for processes, DIAMOND for decisions, ENG_DATABASE for data stores, etc.)
- \`figma_create_connector\` with \`{ start: { nodeId, magnet: 'AUTO' }, end: { nodeId, magnet: 'AUTO' } }\` — \`endCap\` defaults to \`ARROW_EQUILATERAL\` so connectors look like arrows
- Wrap the diagram in a \`figma_create_section\` for grouping

## IMPORTANT: Always Use Search Tools First

When working with Figma documents, ALWAYS prefer search tools over bulk retrieval:

### For Variables
- **USE**: \`figma_search_variables\` (~500 tokens) - Filter by name pattern, type, collection
- **AVOID**: \`figma_get_local_variables\` (25k+ tokens, may truncate)

Example:
\`\`\`
figma_search_variables({ namePattern: "colors/*", type: "COLOR", compact: true })
\`\`\`

### For Nodes
- **USE**: \`figma_search_nodes\` - Find frames/elements by name within a scope
- **USE**: \`figma_get_children\` - Browse hierarchy one level at a time
- **AVOID**: Repeated \`figma_get_nodes\` calls to traverse the tree

Example:
\`\`\`
figma_search_nodes({ parentId: "0:1", nameContains: "Button", types: ["FRAME", "COMPONENT"] })
\`\`\`

### For Components
- **USE**: \`figma_search_components\` - Find by name pattern
- Returns compact results with component metadata

### For Styles
- **USE**: \`figma_search_styles\` - Find by name and type
- **AVOID**: \`figma_get_local_styles\` for large documents

## Workflow

1. **Start with context**: Call \`figma_get_context\` to understand the current document and selection
2. **Search first**: Use search tools to find specific elements by name
3. **Get details only when needed**: Use \`figma_get_nodes\` with \`depth: "minimal"\` or \`"compact"\` for efficiency
4. **Use full depth sparingly**: Only use \`depth: "full"\` when you need all node properties

## Token Optimization

| Tool | Tokens | Use Case |
|------|--------|----------|
| \`figma_search_*\` | ~50/result | Finding specific elements |
| \`figma_get_children\` | ~50/node | Browsing hierarchy |
| \`figma_get_nodes\` (minimal) | ~100/node | Tree traversal |
| \`figma_get_nodes\` (full) | ~500/node | Detailed inspection |
| \`figma_get_local_variables\` | 25k+ | AVOID - use search instead
`
  });

  // Register all Figma tools
  registerTools(server, bridge);

  return server;
}
