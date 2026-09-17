import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { FooterContent } from '../../services/footerService';
import { fetchFooterContent } from '../../services/footerService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface FooterState {
  data: FooterContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: FooterState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchFooterData = createAsyncThunk('footer/fetchData', (_: void, { signal }) =>
  fetchFooterContent(signal),
);

const footerSlice = createSlice({
  name: 'footer',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFooterData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFooterData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchFooterData.rejected, (state, action) => {
        // Aborted by Footer.tsx's own effect cleanup - not a real failure,
        // leave state as-is (matches the original try/catch swallowing
        // AbortError silently).
        if (action.meta.aborted) return;
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load footer.';
      });
  },
});

export default footerSlice.reducer;
