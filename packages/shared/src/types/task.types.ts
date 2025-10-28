export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 1 | 2 | 3 | 4; // 1=critical, 2=high, 3=medium, 4=low

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints?: number;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  vectorClock: Record<string, number>;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  storyPoints?: number;
  dueAt?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  storyPoints?: number;
  dueAt?: string;
  vectorClock: Record<string, number>;
}
