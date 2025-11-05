import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.middleware';
import { eventsRateLimiter } from '../../middleware/rateLimit.middleware';
import { ingestEvents } from './event.service';
import { getRecentEvents } from './event.repository';
import { eventBatchSchema } from './event.validator';
import { subDays } from '../../utils/dateUtils';

const router = Router();

// POST /events — ingest a batch of productivity events
router.post('/', requireAuth, eventsRateLimiter, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const parsed = eventBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    return;
  }

  try {
    await ingestEvents(userId, parsed.data.events.map((e) => ({ ...e, userId })));
    res.status(202).json({ accepted: parsed.data.events.length });
  } catch (err) {
    res.status(500).json({ error: 'Event ingestion failed' });
  }
});

// GET /events?since=ISO — fetch recent events for offline reconciliation
router.get('/', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const since = req.query.since
    ? new Date(req.query.since as string)
    : subDays(new Date(), 7);

  try {
    const events = await getRecentEvents(userId, since);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
