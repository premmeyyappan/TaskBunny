import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Per-device rate limiter for the /events endpoint.
 *
 * Limits each device token to RATE_LIMIT_MAX_PER_DEVICE requests per rolling
 * 24-hour window, falling back to IP if no device ID is present in the JWT.
 */
export const eventsRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_PER_DEVICE,
  keyGenerator: (req) => {
    const deviceId = (req as { deviceId?: string }).deviceId;
    return deviceId ?? req.ip ?? 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Daily event limit reached for this device',
    limit: env.RATE_LIMIT_MAX_PER_DEVICE,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },
});
