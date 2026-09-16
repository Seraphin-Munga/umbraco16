import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { OnlineBankingContent } from '../../services/onlineBankingService';
import { fetchOnlineBankingContent } from '../../services/onlineBankingService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface OnlineBankingState {
  data: OnlineBankingContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: OnlineBankingState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchOnlineBanking = createAsyncThunk('onlineBanking/fetchPage', () => fetchOnlineBankingContent());

const onlineBankingSlice = createSlice({
  name: 'onlineBanking',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOnlineBanking.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchOnlineBanking.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchOnlineBanking.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default onlineBankingSlice.reducer;
