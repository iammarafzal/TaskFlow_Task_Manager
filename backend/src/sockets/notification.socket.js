// src/sockets/notification.socket.js
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';
import { env } from '../config/environment.js';

/**
 * Registry to manage active real-time connections securely across sessions.
 * Maps individual user IDs to an open Set of corresponding WebSocket connections.
 * @type {Map<string, Set<import('ws').WebSocket>>}
 */
export const activeSocketRegistry = new Map();

/**
 * Initializes and binds the decoupled WebSocket architecture onto the underlying HTTP instance.
 * @param {import('http').Server} httpServer - Active application HTTP bootstrap server instance.
 */
export function initializeWebSocketServer(httpServer) {
    const wss = new WebSocketServer({ noServer: true });

    // Handle manual HTTP Upgrade protocol hands-shaking safely
    httpServer.on('upgrade', (request, socket, head) => {
        const pathname = url.parse(request.url).pathname;

        if (pathname === '/ws/notifications') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            // Reject upgrades to non-existent pathways safely
            socket.destroy();
        }
    });

    // Handle lifecycle routing for newly upgraded WebSocket connections
    wss.on('connection', (ws, request) => {
        try {
            const parsedUrl = url.parse(request.url, true);
            const token = parsedUrl.query.token;

            if (!token) {
                // Close Code 1008: Policy Violation (Missing Credentials)
                return ws.close(1008, 'Authentication Token Missing');
            }

            // Verify the cryptographic identity payload
            let decoded;
            try {
                decoded = jwt.verify(token, env.JWT_SECRET);
            } catch (err) {
                return ws.close(1008, 'Invalid or Expired Security Token');
            }

            const userId = decoded.sub;
            if (!userId) {
                return ws.close(1008, 'Corrupted Identity Target Context');
            }

            // Map the newly authenticated socket into the connection registry safely
            if (!activeSocketRegistry.has(userId)) {
                activeSocketRegistry.set(userId, new Set());
            }
            activeSocketRegistry.get(userId).add(ws);

            console.log(`[ObsidianFlow WS] Secure Connection Established for User Profile: ${userId}`);

            // Handle heartbeat pings or standard lifecycle disconnects
            ws.on('close', () => {
                const standardUserConnections = activeSocketRegistry.get(userId);
                if (standardUserConnections) {
                    standardUserConnections.delete(ws);
                    if (standardUserConnections.size === 0) {
                        activeSocketRegistry.delete(userId);
                    }
                }
                console.log(`[WebSocket] Connection Closed for User Profile: ${userId}`);
            });

            ws.on('error', (error) => {
                console.error(`[WebSocket Error] Tenant Scope Context [${userId}]:`, error);
            });

        } catch (criticalSocketError) {
            console.error('[WebSocket Upgrade Exception]:', criticalSocketError);
            ws.close(1011, 'Internal Server Processing Collapse');
        }
    });

    console.log('[ObsidianFlow WS Server] Successfully mapped and bound to path: /ws/notifications');
}

/**
 * Instantly broadcasts data payloads out to every active socket connection registered to a specific user.
 * @param {string} userId - Target entity primary key identification string.
 * @param {Object} broadcastPayload - Raw serializable object structure containing event data.
 */
export function pushRealtimeNotification(userId, broadcastPayload) {
    const targets = activeSocketRegistry.get(userId);
    if (!targets || targets.size === 0) return;

    const stringifiedMessage = JSON.stringify(broadcastPayload);

    for (const clientSocket of targets) {
        if (clientSocket.readyState === 1) { // 1 explicitly signals an OPEN state configuration
            clientSocket.send(stringifiedMessage);
        }
    }
}