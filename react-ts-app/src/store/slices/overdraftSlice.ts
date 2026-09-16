import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { OverdraftContent } from '../../services/overdraftService';
import { fetchOverdraftContent } from '../../services/overdraftService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface OverdraftState {
  data: OverdraftContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: OverdraftState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchOverdraft = createAsyncThunk('overdraft/fetchPage', () => fetchOverdraftContent());

const overdraftSlice = createSlice({
  name: 'overdraft',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverdraft.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchOverdraft.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchOverdraft.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default overdraftSlice.reducer;
