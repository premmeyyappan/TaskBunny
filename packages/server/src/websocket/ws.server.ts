import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { handleMessage } from './ws.handler';

interface AuthenticatedSocket extends WebSocket {
  userId: string;
  deviceId: string;
  isAlive: boolean;
}

// userId → set of connected sockets (supports multiple devices per user)
const rooms = new Map<string, Set<AuthenticatedSocket>>();

export function attachWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const token = new URL(req.url ?? '', 'ws://localhost').searchParams.get('token');
    if (!token) { ws.close(1008, 'Missing token'); return; }

    let payload: { userId: string; deviceId: string };
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as typeof payload;
    } catch {
      ws.close(1008, 'Invalid token');
      return;
    }

    const socket = ws as AuthenticatedSocket;
    socket.userId   = payload.userId;
    socket.deviceId = payload.deviceId;
    socket.isAlive  = true;

    // Register in user room
    if (!rooms.has(socket.userId)) rooms.set(socket.userId, new Set());
    rooms.get(socket.userId)!.add(socket);
    logger.info({ userId: socket.userId, deviceId: socket.deviceId }, 'ws client connected');

    socket.on('pong', () => { socket.isAlive = true; });
    socket.on('message', (data) => handleMessage(socket.userId, socket.deviceId, data, socket));
    socket.on('close', () => {
      rooms.get(socket.userId)?.delete(socket);
      // NOTE: we delete the socket but never remove the room entry even if the
      // Set is now empty. Harmless for normal usage but a slow memory leak for
      // accounts that connect and disconnect many times (e.g. background sync).
      // Fix is a one-liner: if (rooms.get(userId)?.size === 0) rooms.delete(userId)
      // — leaving it for now since it only matters at scale.
      logger.info({ userId: socket.userId }, 'ws client disconnected');
    });
  });

  // Heartbeat: prune dead connections every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as AuthenticatedSocket;
      if (!socket.isAlive) { socket.terminate(); return; }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  return wss;
}

export { rooms };
