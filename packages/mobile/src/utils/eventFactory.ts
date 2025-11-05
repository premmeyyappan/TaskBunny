import { v4 as uuidv4 } from 'uuid';
import type { EventPayload, VectorClock } from '@taskbunny/shared';
import { EventType } from '@taskbunny/shared';

export function makeEvent(
  userId: string,
  deviceId: string,
  eventType: EventType,
  vectorClock: VectorClock,
  options: { taskId?: string; payload?: Record<string, unknown> } = {}
): EventPayload {
  return {
    clientEventId: uuidv4(),
    userId,
    deviceId,
    taskId:        options.taskId,
    eventType,
    payload:       options.payload ?? {},
    recordedAt:    new Date().toISOString(),
    vectorClock,
  };
}
