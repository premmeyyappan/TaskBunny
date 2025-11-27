import { compare, merge, increment, happenedBefore } from '../../server/src/utils/vectorClock';
import type { VectorClock } from '@taskbunny/shared';

describe('vectorClock.compare', () => {
  test('equal clocks return "equal"', () => {
    const vc: VectorClock = { deviceA: 3, deviceB: 2 };
    expect(compare(vc, { ...vc })).toBe('equal');
  });

  test('vc1 strictly greater returns "after"', () => {
    expect(compare({ deviceA: 5 }, { deviceA: 3 })).toBe('after');
  });

  test('vc1 strictly less returns "before"', () => {
    expect(compare({ deviceA: 2 }, { deviceA: 4 })).toBe('before');
  });

  test('concurrent updates (neither dominates) return "concurrent"', () => {
    // deviceA advanced on clock1, deviceB advanced on clock2
    const vc1: VectorClock = { deviceA: 3, deviceB: 1 };
    const vc2: VectorClock = { deviceA: 1, deviceB: 4 };
    expect(compare(vc1, vc2)).toBe('concurrent');
  });

  test('missing device treated as 0', () => {
    // vc1 has deviceB; vc2 does not — vc1 is "after"
    expect(compare({ deviceA: 1, deviceB: 1 }, { deviceA: 1 })).toBe('after');
  });
});

describe('vectorClock.merge', () => {
  test('takes element-wise max', () => {
    const result = merge({ deviceA: 3, deviceB: 1 }, { deviceA: 1, deviceB: 4 });
    expect(result).toEqual({ deviceA: 3, deviceB: 4 });
  });

  test('includes devices from both clocks', () => {
    const result = merge({ deviceA: 2 }, { deviceB: 5 });
    expect(result).toEqual({ deviceA: 2, deviceB: 5 });
  });
});

describe('vectorClock.increment', () => {
  test('increments existing counter', () => {
    expect(increment({ deviceA: 2 }, 'deviceA')).toEqual({ deviceA: 3 });
  });

  test('initialises missing counter at 1', () => {
    expect(increment({}, 'deviceA')).toEqual({ deviceA: 1 });
  });

  test('does not mutate original', () => {
    const vc = { deviceA: 1 };
    increment(vc, 'deviceA');
    expect(vc.deviceA).toBe(1);
  });
});

describe('vectorClock.happenedBefore', () => {
  test('returns true when vc1 < vc2', () => {
    expect(happenedBefore({ deviceA: 1 }, { deviceA: 3 })).toBe(true);
  });

  test('returns false when concurrent', () => {
    expect(happenedBefore({ deviceA: 3, deviceB: 1 }, { deviceA: 1, deviceB: 3 })).toBe(false);
  });
});

// TODO: add tests for the cold-start 'equal' case observed in production
// (two devices syncing simultaneously before either has received an ack).
// The current handling is to accept the event, but we haven't written an
// explicit test that documents that decision.
