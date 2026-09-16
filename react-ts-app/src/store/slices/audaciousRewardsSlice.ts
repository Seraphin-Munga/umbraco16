import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AudaciousRewardsContent } from '../../services/audaciousRewardsService';
import { fetchAudaciousRewardsContent } from '../../services/audaciousRewardsService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AudaciousRewardsState {
  data: AudaciousRewardsContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: AudaciousRewardsState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchAudaciousRewards = createAsyncThunk('audaciousRewards/fetchPage', () => fetchAudaciousRewardsContent());

const audaciousRewardsSlice = createSlice({
  name: 'audaciousRewards',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAudaciousRewards.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAudaciousRewards.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchAudaciousRewards.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default audaciousRewardsSlice.reducer;
