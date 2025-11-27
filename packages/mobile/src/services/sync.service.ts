/**
 * Client-side sync service.
 *
 * Maintains the device's vector clock and handles flush cycles:
 *   1. Drain the offline queue (batches from offline.service.ts).
 *   2. POST to /sync/batch with the current vector clock.
 *   3. On success: update stored vector clock, surface any conflicts.
 *   4. On network failure: leave events in queue for next flush.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { dequeueBatch, enqueue } from './offline.service';
import { apiClient } from './api.service';
import type { SyncBatchResult, VectorClock } from '@taskbunny/shared';

const VECTOR_CLOCK_KEY = '@taskbunny/vector_clock';

export async function getLocalVectorClock(): Promise<VectorClock> {
  try {
    const raw = await AsyncStorage.getItem(VECTOR_CLOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveLocalVectorClock(vc: VectorClock): Promise<void> {
  await AsyncStorage.setItem(VECTOR_CLOCK_KEY, JSON.stringify(vc));
}

/**
 * Flush one batch of queued events to the server.
 * Returns the sync result or null if no events were pending.
 */
export async function flushOnce(deviceId: string): Promise<SyncBatchResult | null> {
  const batch = await dequeueBatch();
  if (batch.length === 0) return null;

  const clientVectorClock = await getLocalVectorClock();

  let result: SyncBatchResult;
  try {
    const response = await apiClient.post<SyncBatchResult>('/sync/batch', {
      deviceId,
      clientVectorClock,
      events: batch,
      taskUpdates: [],
    });
    result = response.data;
  } catch (err) {
    // Re-enqueue failed batch so it is retried next flush
    await enqueue(batch);
    throw err;
  }

  // Merge server vector clock into local state
  const merged: VectorClock = { ...clientVectorClock };
  for (const [device, time] of Object.entries(result.serverVectorClock)) {
    merged[device] = Math.max(merged[device] ?? 0, time);
  }
  await saveLocalVectorClock(merged);

  return result;
}

/**
 * Drain the entire queue in FIFO order.
 * Called when the app comes online or on manual sync trigger.
 */
export async function drainQueue(deviceId: string): Promise<{
  totalApplied: number;
  totalConflicts: number;
}> {
  let totalApplied = 0;
  let totalConflicts = 0;

  let result = await flushOnce(deviceId);
  while (result !== null) {
    totalApplied   += result.applied;
    totalConflicts += result.conflicts.length;
    result = await flushOnce(deviceId);
  }

  return { totalApplied, totalConflicts };
}
