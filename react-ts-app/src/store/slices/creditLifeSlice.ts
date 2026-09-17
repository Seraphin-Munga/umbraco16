import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CreditLifeContent } from '../../services/creditLifeService';
import { fetchCreditLifeContent } from '../../services/creditLifeService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface CreditLifeState {
  data: CreditLifeContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: CreditLifeState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchCreditLife = createAsyncThunk('creditLife/fetchPage', () => fetchCreditLifeContent());

const creditLifeSlice = createSlice({
  name: 'creditLife',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCreditLife.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCreditLife.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchCreditLife.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default creditLifeSlice.reducer;
