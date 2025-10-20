import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(86400000),
  RATE_LIMIT_MAX_PER_DEVICE: z.coerce.number().default(5000),
  SYNC_BATCH_FLUSH_INTERVAL_MS: z.coerce.number().default(200),
  SYNC_BATCH_MAX_SIZE: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
