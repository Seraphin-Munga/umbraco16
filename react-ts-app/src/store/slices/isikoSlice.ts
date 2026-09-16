import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { IsikoContent } from '../../services/isikoService';
import { fetchIsikoContent } from '../../services/isikoService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface IsikoState {
  data: IsikoContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: IsikoState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchIsiko = createAsyncThunk('isiko/fetchPage', () => fetchIsikoContent());

const isikoSlice = createSlice({
  name: 'isiko',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIsiko.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchIsiko.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchIsiko.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default isikoSlice.reducer;
