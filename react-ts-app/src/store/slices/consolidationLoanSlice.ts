import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { ConsolidationLoanContent } from '../../services/consolidationLoanService';
import { fetchConsolidationLoanContent } from '../../services/consolidationLoanService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface ConsolidationLoanState {
  data: ConsolidationLoanContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: ConsolidationLoanState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchConsolidationLoan = createAsyncThunk('consolidationLoan/fetchPage', () => fetchConsolidationLoanContent());

const consolidationLoanSlice = createSlice({
  name: 'consolidationLoan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConsolidationLoan.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchConsolidationLoan.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchConsolidationLoan.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default consolidationLoanSlice.reducer;
