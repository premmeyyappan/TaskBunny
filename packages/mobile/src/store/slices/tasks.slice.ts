import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api.service';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@taskbunny/shared';

interface TasksState {
  items: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = { items: [], loading: false, error: null };

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async () => {
  const res = await apiClient.get<Task[]>('/tasks');
  return res.data;
});

export const createTask = createAsyncThunk(
  'tasks/create',
  async (input: CreateTaskInput) => {
    const res = await apiClient.post<Task>('/tasks', input);
    return res.data;
  }
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, input }: { id: string; input: UpdateTaskInput }) => {
    const res = await apiClient.patch<Task>(`/tasks/${id}`, input);
    return res.data;
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // Optimistic update: immediately reflect local change before server confirms
    applyOptimisticUpdate(state, action: PayloadAction<Task>) {
      const idx = state.items.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending,    (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled,  (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchTasks.rejected,   (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed'; })
      .addCase(createTask.fulfilled,  (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateTask.fulfilled,  (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      });
  },
});

export const { applyOptimisticUpdate } = tasksSlice.actions;
export default tasksSlice.reducer;
