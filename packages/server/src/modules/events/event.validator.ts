import { z } from 'zod';
import { EventType } from '@taskbunny/shared';

export const eventPayloadSchema = z.object({
  clientEventId: z.string().uuid(),
  deviceId:      z.string().min(1),
  taskId:        z.string().uuid().optional(),
  eventType:     z.nativeEnum(EventType),
  payload:       z.record(z.unknown()).default({}),
  recordedAt:    z.string().datetime(),
  vectorClock:   z.record(z.number()).default({}),
});

export const eventBatchSchema = z.object({
  events: z.array(eventPayloadSchema).min(1).max(100),
});

export type ValidatedEventBatch = z.infer<typeof eventBatchSchema>;
