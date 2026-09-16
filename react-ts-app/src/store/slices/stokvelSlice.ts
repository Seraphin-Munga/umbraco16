import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { StokvelContent } from '../../services/stokvelService';
import { fetchStokvelContent } from '../../services/stokvelService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface StokvelState {
  data: StokvelContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: StokvelState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchStokvel = createAsyncThunk('stokvel/fetchPage', () => fetchStokvelContent());

const stokvelSlice = createSlice({
  name: 'stokvel',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStokvel.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchStokvel.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchStokvel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default stokvelSlice.reducer;
