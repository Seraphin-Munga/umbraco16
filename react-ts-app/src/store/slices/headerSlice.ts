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
  data: {
    menu: [
      {
        menuDescription: null,
        menuName: [{ url: '#', title: 'Personal', target: 'x' }],
        menus: [
          {
            categoryName: 'Borrow',
            link: [
              { menuDescription: 'Get fixed repayments on flexible terms', pageSection: null, menuList: [{ url: '#', title: 'Personal Loan', target: null }] },
              { menuDescription: 'Consolidate your debt with lower repayments', pageSection: null, menuList: [{ url: '#', title: 'Consolidation Loan', target: null }] },
              { menuDescription: 'From R2 000 to R50 000, over 9 to 24 months', pageSection: null, menuList: [{ url: '#', title: 'The 12% Loan', target: null }] },
              { menuDescription: 'Get the Credit Card that suits your lifestyle', pageSection: null, menuList: [{ url: '#', title: 'Black credit card', target: null }] },
            ],
          },
          {
            categoryName: 'Banking',
            link: [
              { menuDescription: 'Open a MyWORLD Account', pageSection: null, menuList: [{ url: '#', title: 'Open Account', target: null }] },
              { menuDescription: 'Revolutionary Bank account designed to meet your day-to-day needs', pageSection: null, menuList: [{ url: '#', title: 'MyWORLD', target: null }] },
              { menuDescription: 'Innovative pocket accounts linked to your MyWORLD account', pageSection: null, menuList: [{ url: '#', title: 'Pockets', target: null }] },
            ],
          },
          {
            categoryName: 'Investments',
            link: [
              { menuDescription: 'Make a single deposit for 3 to 60 months', pageSection: null, menuList: [{ url: '#', title: 'Fixed deposits', target: null }] },
              { menuDescription: 'Access your money with 7, 32 or 90 days notice', pageSection: null, menuList: [{ url: '#', title: 'Notice deposits', target: null }] },
            ],
          },
          {
            categoryName: 'Insure',
            link: [
              { menuDescription: 'Cover your loan or credit card debt', pageSection: null, menuList: [{ url: '#', title: 'Credit life', target: null }] },
              { menuDescription: 'Submit your credit life claims', pageSection: null, menuList: [{ url: '#', title: 'Credit life claims', target: null }] },
              { menuDescription: 'Cover yourself and your loved ones', pageSection: null, menuList: [{ url: '#', title: 'Funeral plan', target: null }] },
            ],
          },
          {
            categoryName: 'Lifestyle',
            link: [
              { menuDescription: 'A solution that seamlessly combines modern financial tools with your traditional needs', pageSection: null, menuList: [{ url: '#', title: 'Isiko', target: null }] },
              { menuDescription: 'We can help you take control of your debt and manage your finances better', pageSection: null, menuList: [{ url: '#', title: 'loan restructure', target: null }] },
            ],
          },
          {
            categoryName: 'Rewards',
            link: [
              { menuDescription: 'Get rewarded for everyday banking', pageSection: null, menuList: [{ url: '#', title: 'Audacious Rewards', target: null }] },
              { menuDescription: 'Use your rewards and explore our wide range of amazing offers', pageSection: null, menuList: [{ url: '#', title: 'Audacious Rewards Store', target: null }] },
            ],
          },
        ],
      },
      { menuDescription: null, menus: [], menuName: [{ url: '/en/talk-to-us/', title: 'Talk to us', target: null }] },
      { menuDescription: null, menus: [], menuName: [{ url: '/en/branches/', title: 'Branches', target: null }] },
      { menuDescription: null, menus: [], menuName: [{ url: '#', title: 'Upload documents', target: '' }] },
    ],
  },
  status: 'succeeded',
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
