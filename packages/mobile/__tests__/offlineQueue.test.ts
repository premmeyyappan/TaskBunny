/**
 * Tests for the offline event queue.
 *
 * AsyncStorage is mocked via jest-expo's preset.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueue, dequeueBatch, queueSize, clearQueue } from '../src/services/offline.service';
import { OFFLINE_QUEUE_FLUSH_BATCH_SIZE, OFFLINE_QUEUE_MAX_SIZE } from '@taskbunny/shared';
import type { EventPayload } from '@taskbunny/shared';
import { EventType } from '@taskbunny/shared';

const makeEvent = (id: string): EventPayload => ({
  clientEventId: id,
  userId:        'u1',
  deviceId:      'd1',
  eventType:     EventType.TASK_STARTED,
  payload:       {},
  recordedAt:    new Date().toISOString(),
  vectorClock:   { d1: 1 },
});

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearQueue();
});

describe('offline queue', () => {
  test('enqueue stores events', async () => {
    await enqueue([makeEvent('e1'), makeEvent('e2')]);
    expect(await queueSize()).toBe(2);
  });

  test('dequeueBatch removes and returns events FIFO', async () => {
    await enqueue([makeEvent('e1'), makeEvent('e2'), makeEvent('e3')]);
    const batch = await dequeueBatch();
    expect(batch).toHaveLength(Math.min(3, OFFLINE_QUEUE_FLUSH_BATCH_SIZE));
    expect(batch[0].clientEventId).toBe('e1');
  });

  test('dequeueBatch returns empty array when queue is empty', async () => {
    const batch = await dequeueBatch();
    expect(batch).toEqual([]);
  });

  test('multiple enqueue+dequeue cycles drain correctly', async () => {
    await enqueue([makeEvent('e1')]);
    await enqueue([makeEvent('e2')]);
    const b1 = await dequeueBatch();
    const b2 = await dequeueBatch();
    expect([...b1, ...b2].map((e) => e.clientEventId)).toEqual(
      expect.arrayContaining(['e1', 'e2'])
    );
    expect(await queueSize()).toBe(0);
  });

  test('queue trims oldest events when max size exceeded', async () => {
    const overflow = OFFLINE_QUEUE_MAX_SIZE + 10;
    const events = Array.from({ length: overflow }, (_, i) => makeEvent(`e${i}`));
    await enqueue(events);
    expect(await queueSize()).toBeLessThanOrEqual(OFFLINE_QUEUE_MAX_SIZE);
  });
});
