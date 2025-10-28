import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId: string;
  deviceId: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; deviceId: string };
    (req as AuthRequest).userId = payload.userId;
    (req as AuthRequest).deviceId = payload.deviceId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
