import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CreditReportContent } from '../../services/creditReportService';
import { fetchCreditReportContent } from '../../services/creditReportService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface CreditReportState {
  data: CreditReportContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: CreditReportState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchCreditReport = createAsyncThunk('creditReport/fetchPage', () => fetchCreditReportContent());

const creditReportSlice = createSlice({
  name: 'creditReport',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCreditReport.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCreditReport.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchCreditReport.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default creditReportSlice.reducer;
