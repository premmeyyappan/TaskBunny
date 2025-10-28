import { pool, query, queryOne } from '../../db/client';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@taskbunny/shared';

// Uses idx_tasks_user_status covering index — index-only scan avoids heap fetch
export async function getTasksByStatus(
  userId: string,
  status: string
): Promise<Task[]> {
  return query<Task>(`
    SELECT id, user_id AS "userId", title, description, status,
           priority, story_points AS "storyPoints", due_at AS "dueAt",
           completed_at AS "completedAt", vector_clock AS "vectorClock",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM tasks
    WHERE user_id = $1 AND status = $2
    ORDER BY priority ASC, due_at ASC NULLS LAST
  `, [userId, status]);
}

export async function getAllTasks(userId: string): Promise<Task[]> {
  return query<Task>(`
    SELECT id, user_id AS "userId", title, description, status,
           priority, story_points AS "storyPoints", due_at AS "dueAt",
           completed_at AS "completedAt", vector_clock AS "vectorClock",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM tasks
    WHERE user_id = $1
    ORDER BY priority ASC, created_at DESC
  `, [userId]);
}

export async function getTaskById(id: string, userId: string): Promise<Task | null> {
  return queryOne<Task>(`
    SELECT id, user_id AS "userId", title, description, status,
           priority, story_points AS "storyPoints", due_at AS "dueAt",
           completed_at AS "completedAt", vector_clock AS "vectorClock",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM tasks WHERE id = $1 AND user_id = $2
  `, [id, userId]);
}

export async function createTask(
  userId: string,
  input: CreateTaskInput
): Promise<Task> {
  const row = await queryOne<Task>(`
    INSERT INTO tasks (user_id, title, description, priority, story_points, due_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id AS "userId", title, description, status,
              priority, story_points AS "storyPoints", due_at AS "dueAt",
              completed_at AS "completedAt", vector_clock AS "vectorClock",
              created_at AS "createdAt", updated_at AS "updatedAt"
  `, [userId, input.title, input.description ?? null, input.priority ?? 2,
      input.storyPoints ?? null, input.dueAt ?? null]);
  return row!;
}

export async function updateTask(
  id: string,
  userId: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  const completedAt = input.status === 'completed' ? 'now()' : 'completed_at';
  const row = await queryOne<Task>(`
    UPDATE tasks SET
      title         = COALESCE($3, title),
      description   = COALESCE($4, description),
      status        = COALESCE($5, status),
      priority      = COALESCE($6, priority),
      story_points  = COALESCE($7, story_points),
      due_at        = COALESCE($8, due_at),
      vector_clock  = $9,
      completed_at  = CASE WHEN $5 = 'completed' THEN now() ELSE completed_at END,
      updated_at    = now()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id AS "userId", title, description, status,
              priority, story_points AS "storyPoints", due_at AS "dueAt",
              completed_at AS "completedAt", vector_clock AS "vectorClock",
              created_at AS "createdAt", updated_at AS "updatedAt"
  `, [id, userId, input.title ?? null, input.description ?? null, input.status ?? null,
      input.priority ?? null, input.storyPoints ?? null, input.dueAt ?? null,
      JSON.stringify(input.vectorClock)]);
  return row;
}

export async function deleteTask(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
