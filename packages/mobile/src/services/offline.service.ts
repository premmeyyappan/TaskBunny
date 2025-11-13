/**
 * Offline Event Queue
 *
 * Persists unsynced events to AsyncStorage so they survive app restarts.
 * When the device comes online, sync.service.ts drains this queue.
 *
 * Queue is keyed by @taskbunny/offline_queue and holds an array of EventPayload.
 * Events are appended individually (enqueue) and consumed in FIFO batches (flush).
 *
 * Max queue size: OFFLINE_QUEUE_MAX_SIZE (10,000). If exceeded, oldest events
 * are dropped to prevent unbounded storage growth.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventPayload } from '@taskbunny/shared';
import { OFFLINE_QUEUE_STORAGE_KEY, OFFLINE_QUEUE_MAX_SIZE, OFFLINE_QUEUE_FLUSH_BATCH_SIZE } from '@taskbunny/shared';

async function readQueue(): Promise<EventPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EventPayload[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: EventPayload[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Append one or more events to the offline queue.
 * Drops the oldest events if the queue exceeds OFFLINE_QUEUE_MAX_SIZE.
 */
export async function enqueue(events: EventPayload[]): Promise<void> {
  const current = await readQueue();
  const combined = [...current, ...events];
  const trimmed = combined.length > OFFLINE_QUEUE_MAX_SIZE
    ? combined.slice(combined.length - OFFLINE_QUEUE_MAX_SIZE)
    : combined;
  await writeQueue(trimmed);
}

/**
 * Dequeue up to OFFLINE_QUEUE_FLUSH_BATCH_SIZE events for sending.
 * Returns the batch and removes it from storage atomically.
 *
 * TODO: this isn't actually atomic — if the app is killed between readQueue
 * and writeQueue the batch is lost silently. For now the volume is low enough
 * that re-queueing on next open is acceptable, but should switch to SQLite
 * or a WAL approach if we see complaints about missing events.
 */
export async function dequeueBatch(): Promise<EventPayload[]> {
  const current = await readQueue();
  if (current.length === 0) return [];

  const batch = current.slice(0, OFFLINE_QUEUE_FLUSH_BATCH_SIZE);
  await writeQueue(current.slice(batch.length));
  return batch;
}

export async function queueSize(): Promise<number> {
  const current = await readQueue();
  return current.length;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
}
