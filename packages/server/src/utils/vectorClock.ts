import { VectorClock, ClockComparison } from '@taskbunny/shared';

/**
 * Increment the local device's counter in the vector clock.
 * Called before emitting any event.
 */
export function increment(vc: VectorClock, deviceId: string): VectorClock {
  return { ...vc, [deviceId]: (vc[deviceId] ?? 0) + 1 };
}

/**
 * Element-wise maximum of two vector clocks.
 * Used when merging state after a sync.
 */
export function merge(vc1: VectorClock, vc2: VectorClock): VectorClock {
  const result: VectorClock = { ...vc1 };
  for (const [deviceId, time] of Object.entries(vc2)) {
    result[deviceId] = Math.max(result[deviceId] ?? 0, time);
  }
  return result;
}

/**
 * Compare two vector clocks.
 *
 * Returns:
 *   'before'     — vc1 happened-before vc2 (vc2 is newer)
 *   'after'      — vc1 happened-after vc2 (vc1 is newer)
 *   'concurrent' — neither dominates; updates are concurrent
 *   'equal'      — identical clocks
 */
export function compare(vc1: VectorClock, vc2: VectorClock): ClockComparison {
  const devices = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);
  let vc1Dominates = false;
  let vc2Dominates = false;

  for (const device of devices) {
    const t1 = vc1[device] ?? 0;
    const t2 = vc2[device] ?? 0;
    if (t1 > t2) vc1Dominates = true;
    if (t2 > t1) vc2Dominates = true;
  }

  if (!vc1Dominates && !vc2Dominates) return 'equal';
  if (vc1Dominates && !vc2Dominates) return 'after';  // vc1 > vc2
  if (!vc1Dominates && vc2Dominates) return 'before'; // vc1 < vc2
  return 'concurrent';
}

/**
 * Determine whether vc1 happened-before vc2.
 * Shorthand used in conflict resolution.
 */
export function happenedBefore(vc1: VectorClock, vc2: VectorClock): boolean {
  return compare(vc1, vc2) === 'before';
}
