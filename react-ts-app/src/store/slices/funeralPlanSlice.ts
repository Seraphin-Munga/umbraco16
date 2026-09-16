import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { FuneralPlanContent } from '../../services/funeralPlanService';
import { fetchFuneralPlanContent } from '../../services/funeralPlanService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface FuneralPlanState {
  data: FuneralPlanContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: FuneralPlanState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchFuneralPlan = createAsyncThunk('funeralPlan/fetchPage', () => fetchFuneralPlanContent());

const funeralPlanSlice = createSlice({
  name: 'funeralPlan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFuneralPlan.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFuneralPlan.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchFuneralPlan.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default funeralPlanSlice.reducer;
