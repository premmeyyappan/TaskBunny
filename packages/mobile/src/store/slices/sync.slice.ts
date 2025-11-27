import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { drainQueue } from '../../services/sync.service';
import { enqueue } from '../../services/offline.service';
import type { EventPayload } from '@taskbunny/shared';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  lastConflicts: number;
  error: string | null;
}

const initialState: SyncState = {
  status:          'idle',
  lastSyncedAt:    null,
  pendingCount:    0,
  lastConflicts:   0,
  error:           null,
};

export const triggerSync = createAsyncThunk(
  'sync/drain',
  async (deviceId: string, { rejectWithValue }) => {
    try {
      return await drainQueue(deviceId);
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const queueAndSync = createAsyncThunk(
  'sync/queueAndSync',
  async (
    { events, deviceId }: { events: EventPayload[]; deviceId: string },
    { dispatch }
  ) => {
    await enqueue(events);
    dispatch(triggerSync(deviceId));
  }
);

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<SyncStatus>) {
      state.status = action.payload;
    },
    incrementPending(state, action: PayloadAction<number>) {
      state.pendingCount += action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(triggerSync.pending, (state) => {
        state.status = 'syncing';
        state.error  = null;
      })
      .addCase(triggerSync.fulfilled, (state, action) => {
        state.status         = 'idle';
        state.lastSyncedAt   = new Date().toISOString();
        state.lastConflicts  = action.payload.totalConflicts;
        state.pendingCount   = 0;
      })
      .addCase(triggerSync.rejected, (state, action) => {
        state.status = 'error';
        state.error  = action.payload as string;
      });
  },
});

export const { setStatus, incrementPending } = syncSlice.actions;
export default syncSlice.reducer;
