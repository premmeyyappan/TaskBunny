import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.middleware';
import { computeAndPersistScore, getLatestScore, getTrend, getLongitudinalAnalysis } from './analytics.service';

const router = Router();

// GET /analytics/score — compute (or return cached) productivity score
router.get('/score', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  try {
    const refresh = req.query.refresh === 'true';
    const score = refresh
      ? await computeAndPersistScore(userId)
      : (await getLatestScore(userId)) ?? (await computeAndPersistScore(userId));
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute score' });
  }
});

// GET /analytics/trend?days=30 — time-series buckets for trend chart
router.get('/trend', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const days = Math.min(parseInt(req.query.days as string ?? '30'), 90);
  try {
    const buckets = await getTrend(userId, days);
    res.json(buckets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// GET /analytics/longitudinal?days=90 — OLS regression over score history
// Returns: slope/week, R², trend classification, 4-week projection
router.get('/longitudinal', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const days = Math.min(parseInt(req.query.days as string ?? '90'), 365);
  try {
    const analysis = await getLongitudinalAnalysis(userId, days);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute longitudinal analysis' });
  }
});

export default router;
