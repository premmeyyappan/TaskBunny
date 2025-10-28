import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool, queryOne } from '../../db/client';
import { env } from '../../config/env';

const router = Router();

const registerSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(1).max(100),
  password: z.string().min(8),
  deviceId: z.string().min(1),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
  deviceId: z.string().min(1),
});

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }

  const { email, name, password, deviceId } = parsed.data;
  const hash = await bcrypt.hash(password, 12);

  try {
    const user = await queryOne<{ id: string; email: string; name: string }>(`
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name
    `, [email, name, hash]);

    const token = signToken(user!.id, deviceId);
    res.status(201).json({ token, user });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' });
    return;
  }

  const { email, password, deviceId } = parsed.data;
  const user = await queryOne<{ id: string; email: string; name: string; password_hash: string }>(`
    SELECT id, email, name, password_hash FROM users WHERE email = $1
  `, [email]);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken(user.id, deviceId);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

function signToken(userId: string, deviceId: string): string {
  return jwt.sign({ userId, deviceId }, env.JWT_SECRET, { expiresIn: '30d' });
}

export default router;
