import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayShapContent } from '../../services/payShapService';
import { fetchPayShapContent } from '../../services/payShapService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface PayShapState {
  data: PayShapContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: PayShapState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchPayShap = createAsyncThunk('payShap/fetchPage', () => fetchPayShapContent());

const payShapSlice = createSlice({
  name: 'payShap',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayShap.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPayShap.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchPayShap.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default payShapSlice.reducer;
