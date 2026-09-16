import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { HomeContent } from '../../services/homeService';
import { fetchHomeContent } from '../../services/homeService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface HomeState {
  data: HomeContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: HomeState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchHome = createAsyncThunk('home/fetchContent', (_: void, { signal }) =>
  fetchHomeContent(signal),
);

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHome.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchHome.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchHome.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load home page content.';
      });
  },
});

export default homeSlice.reducer;
