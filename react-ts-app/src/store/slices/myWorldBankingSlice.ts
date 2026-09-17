import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { MyWorldBankingContent } from '../../services/myWorldBankingService';
import { fetchMyWorldBankingContent } from '../../services/myWorldBankingService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface MyWorldBankingState {
  data: MyWorldBankingContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: MyWorldBankingState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchMyWorldBanking = createAsyncThunk('myWorldBanking/fetchPage', () => fetchMyWorldBankingContent());

const myWorldBankingSlice = createSlice({
  name: 'myWorldBanking',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyWorldBanking.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyWorldBanking.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchMyWorldBanking.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default myWorldBankingSlice.reducer;
