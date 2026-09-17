import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CreditCardContent } from '../../services/creditCardService';
import { fetchCreditCardContent } from '../../services/creditCardService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface CreditCardState {
  data: CreditCardContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: CreditCardState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchCreditCard = createAsyncThunk('creditCard/fetchPage', () => fetchCreditCardContent());

const creditCardSlice = createSlice({
  name: 'creditCard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCreditCard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCreditCard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchCreditCard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default creditCardSlice.reducer;
