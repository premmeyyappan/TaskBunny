import { z } from 'zod';

export const createTaskSchema = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  priority:    z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(2),
  storyPoints: z.number().int().min(1).max(100).optional(),
  dueAt:       z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title:       z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status:      z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority:    z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  storyPoints: z.number().int().min(1).max(100).optional(),
  dueAt:       z.string().datetime().optional(),
  vectorClock: z.record(z.number()).default({}),
});
