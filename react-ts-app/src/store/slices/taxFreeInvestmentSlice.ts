import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { TaxFreeInvestmentContent } from '../../services/taxFreeInvestmentService';
import { fetchTaxFreeInvestmentContent } from '../../services/taxFreeInvestmentService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface TaxFreeInvestmentState {
  data: TaxFreeInvestmentContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: TaxFreeInvestmentState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchTaxFreeInvestment = createAsyncThunk('taxFreeInvestment/fetchPage', () => fetchTaxFreeInvestmentContent());

const taxFreeInvestmentSlice = createSlice({
  name: 'taxFreeInvestment',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaxFreeInvestment.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTaxFreeInvestment.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchTaxFreeInvestment.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default taxFreeInvestmentSlice.reducer;
