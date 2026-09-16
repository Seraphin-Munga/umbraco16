import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { LoanRestructureContent } from '../../services/loanRestructureService';
import { fetchLoanRestructureContent } from '../../services/loanRestructureService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface LoanRestructureState {
  data: LoanRestructureContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: LoanRestructureState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchLoanRestructure = createAsyncThunk('loanRestructure/fetchPage', () => fetchLoanRestructureContent());

const loanRestructureSlice = createSlice({
  name: 'loanRestructure',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoanRestructure.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchLoanRestructure.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchLoanRestructure.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default loanRestructureSlice.reducer;
