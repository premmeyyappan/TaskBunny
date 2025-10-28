export enum EventType {
  TASK_STARTED = 'task_started',
  TASK_PAUSED = 'task_paused',
  TASK_RESUMED = 'task_resumed',
  TASK_COMPLETED = 'task_completed',
  TASK_CANCELLED = 'task_cancelled',
  FOCUS_SESSION_TICK = 'focus_session_tick',
  APP_FOREGROUNDED = 'app_foregrounded',
  APP_BACKGROUNDED = 'app_backgrounded',
  INTERRUPTION = 'interruption',
  SYNC_INITIATED = 'sync_initiated',
  SYNC_COMPLETED = 'sync_completed',
}

export interface EventPayload {
  clientEventId: string;
  userId: string;
  deviceId: string;
  taskId?: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  recordedAt: string; // ISO 8601
  vectorClock: VectorClock;
}

export type VectorClock = Record<string, number>;
