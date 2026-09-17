import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { FixedDepositsContent } from '../../services/fixedDepositsService';
import { fetchFixedDepositsContent } from '../../services/fixedDepositsService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface FixedDepositsState {
  data: FixedDepositsContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: FixedDepositsState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchFixedDeposits = createAsyncThunk('fixedDeposits/fetchPage', () => fetchFixedDepositsContent());

const fixedDepositsSlice = createSlice({
  name: 'fixedDeposits',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFixedDeposits.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFixedDeposits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchFixedDeposits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default fixedDepositsSlice.reducer;
