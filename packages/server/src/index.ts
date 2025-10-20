import http from 'http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { requestId } from './middleware/requestId.middleware';
import { pool } from './db/client';
import { attachWebSocketServer } from './websocket/ws.server';
import authRouter     from './modules/auth/auth.controller';
import eventsRouter   from './modules/events/event.controller';
import tasksRouter    from './modules/tasks/task.controller';
import analyticsRouter from './modules/analytics/analytics.controller';
import syncRouter     from './modules/sync/sync.controller';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(requestId);

app.use('/auth',      authRouter);
app.use('/events',    eventsRouter);
app.use('/tasks',     tasksRouter);
app.use('/analytics', analyticsRouter);
app.use('/sync',      syncRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'TaskBunny server started');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down');
  await pool.end();
  server.close(() => process.exit(0));
});
