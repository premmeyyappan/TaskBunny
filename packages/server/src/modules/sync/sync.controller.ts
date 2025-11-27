import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.middleware';
import { eventsRateLimiter } from '../../middleware/rateLimit.middleware';
import { processSyncBatch } from './sync.service';
import { getCheckpoint } from './sync.repository';
import type { SyncBatchRequest } from '@taskbunny/shared';

const router = Router();

/**
 * POST /sync/batch
 * Accepts a batch of events and task updates from a device,
 * applies conflict resolution, and returns the merged result.
 */
router.post('/batch', requireAuth, eventsRateLimiter, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const body = req.body as SyncBatchRequest;

  if (!body.deviceId || !Array.isArray(body.events)) {
    res.status(400).json({ error: 'deviceId and events array required' });
    return;
  }

  try {
    const result = await processSyncBatch(userId, body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Sync batch failed' });
  }
});

/**
 * GET /sync/checkpoint
 * Returns the last known sync state for a device, used on app startup
 * to determine which events need to be fetched since last sync.
 */
router.get('/checkpoint', requireAuth, async (req, res: Response) => {
  const { userId, deviceId } = req as AuthRequest;
  try {
    const checkpoint = await getCheckpoint(userId, deviceId);
    res.json(checkpoint ?? { userId, deviceId, vectorClock: {}, lastSyncedAt: null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch checkpoint' });
  }
});

export default router;
