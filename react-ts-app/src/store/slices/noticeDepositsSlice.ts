import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { NoticeDepositsContent } from '../../services/noticeDepositsService';
import { fetchNoticeDepositsContent } from '../../services/noticeDepositsService';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface NoticeDepositsState {
  data: NoticeDepositsContent | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: NoticeDepositsState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchNoticeDeposits = createAsyncThunk('noticeDeposits/fetchPage', () => fetchNoticeDepositsContent());

const noticeDepositsSlice = createSlice({
  name: 'noticeDeposits',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNoticeDeposits.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNoticeDeposits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchNoticeDeposits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load page content';
      });
  },
});

export default noticeDepositsSlice.reducer;
