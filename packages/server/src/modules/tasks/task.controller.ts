import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth.middleware';
import { createTaskSchema, updateTaskSchema } from './task.validator';
import {
  getAllTasks, getTasksByStatus, getTaskById,
  createTask, updateTask, deleteTask
} from './task.repository';

const router = Router();

router.get('/', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const status = req.query.status as string | undefined;
  try {
    const tasks = status
      ? await getTasksByStatus(userId, status)
      : await getAllTasks(userId);
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const task = await getTaskById(req.params.id, userId);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json(task);
});

router.post('/', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }
  try {
    const task = await createTask(userId, parsed.data);
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    return;
  }
  try {
    const task = await updateTask(req.params.id, userId, parsed.data);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const deleted = await deleteTask(req.params.id, userId);
  if (!deleted) { res.status(404).json({ error: 'Task not found' }); return; }
  res.status(204).send();
});

export default router;
