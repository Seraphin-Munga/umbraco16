import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { TechDealsContent } from '../../services/techDealsService';
import { fetchTechDealsContent } from '../../services/techDealsService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface TechDealsState {
  data: TechDealsContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: TechDealsState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchTechDeals = createAsyncThunk('techDeals/fetchPage', () => fetchTechDealsContent());

const techDealsSlice = createSlice({
  name: 'techDeals',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTechDeals.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTechDeals.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchTechDeals.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default techDealsSlice.reducer;
