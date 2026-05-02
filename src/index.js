#!/usr/bin/env node

/**
 * Figma MCP Bridge - Entry Point
 *
 * Starts the WebSocket server for Figma plugin communication
 * and the MCP server for Claude communication.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FigmaBridge } from './websocket.js';
import { createServer } from './server.js';

const PORT = parseInt(process.env.FIGMA_BRIDGE_PORT || '3055', 10);

async function main() {
  console.error('[FigmaMCP] Starting Figma MCP Bridge...');

  // Create and start WebSocket bridge
  const bridge = new FigmaBridge(PORT);
  await bridge.start();

  // Log connection events
  bridge.on('connected', (info) => {
    console.error(`[FigmaMCP] Figma connected: ${info.fileName}`);
  });

  bridge.on('disconnected', () => {
    console.error('[FigmaMCP] Figma disconnected');
  });

  // Create MCP server
  const server = createServer(bridge);

  // Connect to stdio transport (Claude communication)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[FigmaMCP] MCP server running, WebSocket bound to port ${bridge.port}. Waiting for Figma plugin connection...`);

  // Graceful shutdown helper
  const shutdown = async (reason) => {
    console.error(`[FigmaMCP] Shutting down (${reason})...`);
    await bridge.stop();
    process.exit(0);
  };

  // Handle graceful shutdown
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle stdio close (when Claude closes the connection)
  process.stdin.on('close', () => shutdown('stdin closed'));
  transport.onclose = () => shutdown('transport closed');
}

main().catch((error) => {
  console.error('[FigmaMCP] Fatal error:', error);
  process.exit(1);
});
