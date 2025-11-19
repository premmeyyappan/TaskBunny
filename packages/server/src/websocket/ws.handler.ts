import { RawData, WebSocket } from 'ws';
import { logger } from '../utils/logger';

type IncomingMessage =
  | { type: 'ping' }
  | { type: 'subscribe_score' };

export function handleMessage(
  userId: string,
  deviceId: string,
  data: RawData,
  socket: WebSocket
): void {
  let msg: IncomingMessage;
  try {
    msg = JSON.parse(data.toString());
  } catch {
    socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    return;
  }

  switch (msg.type) {
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong' }));
      break;
    case 'subscribe_score':
      // Acknowledged — score updates are pushed via broadcastToUser after sync
      socket.send(JSON.stringify({ type: 'subscribed', channel: 'score' }));
      break;
    default:
      logger.warn({ userId, deviceId, msg }, 'unknown ws message type');
  }
}
