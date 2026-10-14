/**
 * The package version, read once from package.json so every place that reports
 * it (the MCP server info, figma_server_info, the plugin handshake) matches the
 * published artifact.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readVersion() {
  try {
    return JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).version;
  } catch (_) {
    // package.json not found — report that rather than a made-up version
    return 'unknown';
  }
}

export const VERSION = readVersion();
