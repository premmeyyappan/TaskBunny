import { EventPayload, VectorClock } from './event.types';
import { Task } from './task.types';

export type ClockComparison = 'before' | 'after' | 'concurrent' | 'equal';

export interface SyncBatchRequest {
  deviceId: string;
  clientVectorClock: VectorClock;
  events: EventPayload[];
  taskUpdates: Array<{ task: Task; deviceId: string }>;
}

export interface ConflictRecord {
  clientEventId: string;
  conflictType: 'event_superseded' | 'task_conflict';
  clientVersion: unknown;
  serverVersion: unknown;
  resolution: 'server_wins' | 'client_wins' | 'merged';
}

export interface SyncBatchResult {
  applied: number;
  skipped: number;
  conflicts: ConflictRecord[];
  serverVectorClock: VectorClock;
  serverTimestamp: string;
}

export interface SyncCheckpoint {
  userId: string;
  deviceId: string;
  vectorClock: VectorClock;
  lastSyncedAt: string;
}
