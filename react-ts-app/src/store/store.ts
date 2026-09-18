import { configureStore } from '@reduxjs/toolkit';
import headerReducer from './slices/headerSlice';
import footerReducer from './slices/footerSlice';

export const store = configureStore({
  reducer: {
    header: headerReducer,
    footer: footerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
