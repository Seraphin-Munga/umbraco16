import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { TwelvePercentLoanContent } from '../../services/twelvePercentLoanService';
import { fetchTwelvePercentLoanContent } from '../../services/twelvePercentLoanService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface TwelvePercentLoanState {
  data: TwelvePercentLoanContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: TwelvePercentLoanState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchTwelvePercentLoan = createAsyncThunk('twelvePercentLoan/fetchPage', () => fetchTwelvePercentLoanContent());

const twelvePercentLoanSlice = createSlice({
  name: 'twelvePercentLoan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTwelvePercentLoan.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTwelvePercentLoan.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchTwelvePercentLoan.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default twelvePercentLoanSlice.reducer;
