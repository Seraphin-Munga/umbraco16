import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AccessAccumulatorContent } from '../../services/accessAccumulatorService';
import { fetchAccessAccumulatorContent } from '../../services/accessAccumulatorService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AccessAccumulatorState {
  data: AccessAccumulatorContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: AccessAccumulatorState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchAccessAccumulator = createAsyncThunk('accessAccumulator/fetchPage', () => fetchAccessAccumulatorContent());

const accessAccumulatorSlice = createSlice({
  name: 'accessAccumulator',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccessAccumulator.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAccessAccumulator.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchAccessAccumulator.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default accessAccumulatorSlice.reducer;
