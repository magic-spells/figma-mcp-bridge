import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

const DEFAULT_PORT = 3055;
const REQUEST_TIMEOUT = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export class FigmaBridge extends EventEmitter {
  constructor(port = DEFAULT_PORT) {
    super();
    this.port = port;
    this.wss = null;
    this.connection = null;
    this.connectionState = 'disconnected';
    this.documentInfo = null;
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;
    this.heartbeatInterval = null;
  }

  async start() {
    const maxPort = DEFAULT_PORT + 15;

    const tryPort = (port) => {
      return new Promise((resolve, reject) => {
        const wss = new WebSocketServer({ port });

        wss.on('listening', () => {
          console.error(`[FigmaBridge] WebSocket server listening on port ${port}`);
          this.wss = wss;
          this.port = port;
          resolve();
        });

        wss.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`[FigmaBridge] Port ${port} in use, trying ${port + 1}`);
            wss.close();
            if (port < maxPort) {
              tryPort(port + 1).then(resolve, reject);
            } else {
              reject(new Error(`Could not find available port (tried ${DEFAULT_PORT}-${maxPort})`));
            }
          } else {
            reject(error);
          }
        });

        wss.on('connection', (ws) => this._handleConnection(ws));
      });
    };

    return tryPort(this.port);
  }

  _handleConnection(ws) {
    console.error('[FigmaBridge] Plugin connected');

    // Replace existing connection if any. Its state is torn down here, not
    // when its 'close' event arrives: that event lands after the new socket
    // is current and is ignored (_handleClose), so it can't wipe the
    // connection that replaced it.
    const previous = this.connection;
    if (previous) {
      console.error('[FigmaBridge] Replacing existing connection');
      this._resetConnection('Connection replaced');
      previous.close(1000, 'New connection');
    }

    this.connection = ws;
    this.connectionState = 'connecting';

    ws.on('message', (data) => this._handleMessage(ws, data));
    ws.on('close', () => this._handleClose(ws));
    ws.on('error', (error) => this._handleError(error));
  }

  _handleMessage(ws, data) {
    // A replaced socket can still deliver messages; only the current one counts.
    if (ws !== this.connection) return;

    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      console.error('[FigmaBridge] Failed to parse message:', error);
      return;
    }

    // Handle handshake from plugin
    if (message.type === 'handshake') {
      this.documentInfo = message.payload;
      this.connectionState = 'connected';
      console.error(`[FigmaBridge] Handshake complete: ${message.payload.fileName}`);

      // Send handshake acknowledgment
      ws.send(JSON.stringify({
        type: 'handshake_ack',
        payload: {
          serverVersion: '0.1.0',
          sessionId: `sess_${Date.now()}`
        }
      }));

      this._startHeartbeat();
      this.emit('connected', this.documentInfo);
      return;
    }

    // Handle pong (heartbeat response)
    if (message.type === 'pong') {
      return;
    }

    // Handle command response
    if (message.responseTo) {
      const pending = this.pendingRequests.get(message.responseTo);
      if (pending) {
        this.pendingRequests.delete(message.responseTo);
        clearTimeout(pending.timeout);

        if (message.payload?.error) {
          pending.reject(new BridgeError(
            message.payload.error.code || 'UNKNOWN_ERROR',
            message.payload.error.message || 'Unknown error',
            message.payload.error.details
          ));
        } else {
          pending.resolve(message.payload);
        }
      }
    }
  }

  _handleClose(ws) {
    // A replaced socket closing says nothing about the current connection.
    if (ws !== this.connection) return;

    console.error('[FigmaBridge] Connection closed');
    this._resetConnection('Connection closed');
    this.emit('disconnected');
  }

  _resetConnection(reason) {
    this.connectionState = 'disconnected';
    this.connection = null;
    this.documentInfo = null;
    this._stopHeartbeat();

    // Requests sent over this socket can never be answered now.
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new BridgeError('CONNECTION_CLOSED', reason));
    }
    this.pendingRequests.clear();
  }

  _handleError(error) {
    console.error('[FigmaBridge] WebSocket error:', error.message);
    this.emit('error', error);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.connection && this.connectionState === 'connected') {
        this.connection.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send a command to the Figma plugin and wait for response
   * @param {string} command - Command name
   * @param {object} payload - Command payload
   * @returns {Promise<object>} Response payload
   */
  async sendCommand(command, payload = {}) {
    if (this.connectionState !== 'connected') {
      throw new BridgeError(
        'NOT_CONNECTED',
        'Figma plugin is not connected. Please open Figma and run the Claude Bridge plugin.'
      );
    }

    const requestId = `req_${++this.requestIdCounter}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new BridgeError('TIMEOUT', `Command "${command}" timed out after ${REQUEST_TIMEOUT}ms`));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.connection.send(JSON.stringify({
        requestId,
        command,
        payload
      }));
    });
  }

  isConnected() {
    return this.connectionState === 'connected';
  }

  getDocumentInfo() {
    return this.documentInfo;
  }

  async stop() {
    this._stopHeartbeat();

    if (this.connection) {
      this.connection.close(1000, 'Server shutdown');
    }

    if (this.wss) {
      return new Promise((resolve) => {
        this.wss.close(() => {
          console.error('[FigmaBridge] WebSocket server stopped');
          resolve();
        });
      });
    }
  }
}

export class BridgeError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.details = details;
  }
}
