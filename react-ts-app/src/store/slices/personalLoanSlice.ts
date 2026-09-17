import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PersonalLoanContent } from '../../services/personalLoanService';
import { fetchPersonalLoanContent } from '../../services/personalLoanService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface PersonalLoanState {
  data: PersonalLoanContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: PersonalLoanState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchPersonalLoan = createAsyncThunk('personalLoan/fetchPage', (_: void, { signal }) =>
  fetchPersonalLoanContent(signal),
);

const personalLoanSlice = createSlice({
  name: 'personalLoan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonalLoan.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPersonalLoan.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchPersonalLoan.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default personalLoanSlice.reducer;
