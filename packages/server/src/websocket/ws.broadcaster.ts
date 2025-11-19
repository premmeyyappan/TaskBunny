import { WebSocket } from 'ws';
import { rooms } from './ws.server';
import { logger } from '../utils/logger';

type BroadcastEvent =
  | { type: 'sync_complete'; payload: { applied: number; serverTimestamp: string } }
  | { type: 'score_updated'; payload: { score: number; computedAt: string } }
  | { type: 'task_updated'; payload: { taskId: string; status: string } };

/**
 * Broadcast an event to all connected devices for a user, optionally
 * excluding the originating device (to prevent echo).
 */
export function broadcastToUser(
  userId: string,
  event: BroadcastEvent,
  excludeDeviceId?: string
): void {
  const sockets = rooms.get(userId);
  if (!sockets) return;

  const message = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState !== WebSocket.OPEN) continue;
    if (excludeDeviceId && (socket as { deviceId?: string }).deviceId === excludeDeviceId) continue;
    socket.send(message);
  }

  logger.debug({ userId, eventType: event.type, recipients: sockets.size }, 'ws broadcast');
}
