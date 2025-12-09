import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api.service';
import type { ProductivityScore, TimeSeriesBucket } from '@taskbunny/shared';

interface AnalyticsState {
  score: ProductivityScore | null;
  trend: TimeSeriesBucket[];
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  score: null, trend: [], loading: false, error: null,
};

export const fetchScore = createAsyncThunk('analytics/fetchScore', async () => {
  const res = await apiClient.get<ProductivityScore>('/analytics/score');
  return res.data;
});

export const refreshScore = createAsyncThunk('analytics/refreshScore', async () => {
  const res = await apiClient.get<ProductivityScore>('/analytics/score?refresh=true');
  return res.data;
});

export const fetchTrend = createAsyncThunk(
  'analytics/fetchTrend',
  async (days: number = 30) => {
    const res = await apiClient.get<TimeSeriesBucket[]>(`/analytics/trend?days=${days}`);
    return res.data;
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    updateScoreFromWs(state, action: { payload: { score: number; computedAt: string } }) {
      if (state.score) state.score.score = action.payload.score;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScore.pending,    (state) => { state.loading = true; })
      .addCase(fetchScore.fulfilled,  (state, action) => { state.loading = false; state.score = action.payload; })
      .addCase(fetchScore.rejected,   (state, action) => { state.loading = false; state.error = action.error.message ?? null; })
      .addCase(refreshScore.fulfilled,(state, action) => { state.score = action.payload; })
      .addCase(fetchTrend.fulfilled,  (state, action) => { state.trend = action.payload; });
  },
});

export const { updateScoreFromWs } = analyticsSlice.actions;
export default analyticsSlice.reducer;
