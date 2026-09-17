import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { HeaderContent } from '../../services/headerService';
import { fetchHeaderContent } from '../../services/headerService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface HeaderState {
  data: HeaderContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: HeaderState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchHeaderNavigation = createAsyncThunk('header/fetchNavigation', (_: void, { signal }) =>
  fetchHeaderContent(signal),
);

const headerSlice = createSlice({
  name: 'header',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHeaderNavigation.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchHeaderNavigation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchHeaderNavigation.rejected, (state, action) => {
        // Aborted by Header.tsx's own effect cleanup (route re-render,
        // StrictMode double-invoke) - not a real failure, leave state as-is.
        if (action.meta.aborted) return;
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load navigation.';
      });
  },
});

export default headerSlice.reducer;
